/**
 * Baca dan tulis file Excel (.xlsx) tanpa pustaka tambahan.
 * .xlsx = arsip ZIP berisi XML. Baca: DecompressionStream bawaan browser + pengurai XML sederhana.
 * Tulis: ZIP, tanpa kompresi kecuali diberi fungsi kompres.
 * File ini sengaja tanpa import agar juga dapat dipakai skrip Node (alat/buat-dummy.mjs).
 */

const u16 = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8);
const u32 = (b: Uint8Array, i: number) => (u16(b, i) | (u16(b, i + 2) << 16)) >>> 0;

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const aliran = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(aliran).arrayBuffer());
}

/** Daftar isi ZIP: nama file → fungsi untuk membuka isinya. */
function bacaZip(b: Uint8Array): Map<string, () => Promise<Uint8Array>> {
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65_557); i--) {
    if (u32(b, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Bukan file .xlsx.");
  const isi = new Map<string, () => Promise<Uint8Array>>();
  let p = u32(b, eocd + 16);
  for (let n = u16(b, eocd + 10); n > 0; n--) {
    if (u32(b, p) !== 0x02014b50) throw new Error("File .xlsx rusak.");
    const metode = u16(b, p + 10);
    const ukuran = u32(b, p + 20);
    const panjangNama = u16(b, p + 28);
    const lokal = u32(b, p + 42);
    const nama = new TextDecoder().decode(b.subarray(p + 46, p + 46 + panjangNama));
    const awal = lokal + 30 + u16(b, lokal + 26) + u16(b, lokal + 28);
    const data = b.subarray(awal, awal + ukuran);
    isi.set(nama, async () => (metode === 0 ? data : metode === 8 ? inflate(data) : Promise.reject(new Error("Kompresi .xlsx tidak dikenal."))));
    p += 46 + panjangNama + u16(b, p + 30) + u16(b, p + 32);
  }
  return isi;
}

const ENTITAS: Record<string, string> = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };
const teksXml = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) =>
    e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENTITAS[e] ?? m),
  );
const atribut = (tag: string, nama: string) => new RegExp(`\\s${nama}="([^"]*)"`).exec(tag)?.[1];
const gabungT = (xml: string) =>
  [...xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "").matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => teksXml(m[1]!)).join("");

/** Huruf kolom (A, B, ..., AA) → indeks 0. */
function indeksKolom(ref: string): number {
  let n = 0;
  for (const c of ref.replace(/\d+$/, "")) n = n * 26 + c.charCodeAt(0) - 64;
  return n - 1;
}

/** Baca sheet pertama sebagai tabel teks. Baris kosong tetap ada agar nomor baris sama dengan Excel. */
export async function bacaXlsx(file: Uint8Array): Promise<string[][]> {
  const zip = bacaZip(file);
  const teks = async (nama: string) => {
    const f = zip.get(nama);
    return f ? new TextDecoder().decode(await f()) : "";
  };
  const workbook = await teks("xl/workbook.xml");
  const idSheet = atribut(/<sheet\b[^>]*>/.exec(workbook)?.[0] ?? "", "r:id");
  const rel = [...(await teks("xl/_rels/workbook.xml.rels")).matchAll(/<Relationship\b[^>]*>/g)].find((m) => atribut(m[0], "Id") === idSheet);
  const target = atribut(rel?.[0] ?? "", "Target") ?? "worksheets/sheet1.xml";
  const xmlSheet = await teks(target.startsWith("/") ? target.slice(1) : "xl/" + target);
  if (!xmlSheet) throw new Error("Sheet pertama tidak ditemukan.");
  const bersama = [...(await teks("xl/sharedStrings.xml")).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => gabungT(m[1]!));

  const tabel: string[][] = [];
  for (const r of xmlSheet.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const nomor = Number(atribut(r[0], "r")) || tabel.length + 1;
    const baris: string[] = [];
    let ke = 0;
    for (const c of (r[2] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = atribut(c[0], "r");
      if (ref) ke = indeksKolom(ref);
      const jenis = atribut(c[0], "t");
      const isi = c[2] ?? "";
      const v = teksXml(/<v>([\s\S]*?)<\/v>/.exec(isi)?.[1] ?? "");
      let nilai = v;
      if (jenis === "s") nilai = bersama[+v] ?? "";
      else if (jenis === "inlineStr") nilai = gabungT(isi);
      else if (/e/i.test(v) && !jenis && Number.isFinite(+v)) nilai = (+v).toLocaleString("fullwide", { useGrouping: false, maximumFractionDigits: 20 });
      baris[ke++] = nilai;
    }
    tabel[nomor - 1] = Array.from(baris, (x) => x ?? "");
  }
  return Array.from(tabel, (x) => x ?? []);
}

// ---------------------------------------------------------------------------
// Tulis
// ---------------------------------------------------------------------------
const TABEL_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (const x of b) c = TABEL_CRC[(c ^ x) & 255]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function buatZip(file: [string, string][], kompres?: (d: Uint8Array) => Uint8Array): Uint8Array {
  const enc = new TextEncoder();
  const lokal: Uint8Array[] = [];
  const pusat: Uint8Array[] = [];
  let offset = 0;
  for (const [nama, isi] of file) {
    const n = enc.encode(nama);
    const asli = enc.encode(isi);
    const crc = crc32(asli);
    const d = kompres ? kompres(asli) : asli;
    const metode = kompres ? 8 : 0;
    const tulis = (h: DataView, isian: number[][]) => isian.forEach(([i, v, s]) => (s === 4 ? h.setUint32(i!, v!, true) : h.setUint16(i!, v!, true)));
    const l = new DataView(new ArrayBuffer(30));
    tulis(l, [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, metode, 2], [12, 33, 2], [14, crc, 4], [18, d.length, 4], [22, asli.length, 4], [26, n.length, 2]]);
    const c = new DataView(new ArrayBuffer(46));
    tulis(c, [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, metode, 2], [14, 33, 2], [16, crc, 4], [20, d.length, 4], [24, asli.length, 4], [28, n.length, 2], [42, offset, 4]]);
    lokal.push(new Uint8Array(l.buffer), n, d);
    pusat.push(new Uint8Array(c.buffer), n);
    offset += 30 + n.length + d.length;
  }
  const ukuranPusat = pusat.reduce((a, x) => a + x.length, 0);
  const akhir = new DataView(new ArrayBuffer(22));
  akhir.setUint32(0, 0x06054b50, true);
  akhir.setUint16(8, file.length, true);
  akhir.setUint16(10, file.length, true);
  akhir.setUint32(12, ukuranPusat, true);
  akhir.setUint32(16, offset, true);
  const semua = [...lokal, ...pusat, new Uint8Array(akhir.buffer)];
  const hasil = new Uint8Array(semua.reduce((a, x) => a + x.length, 0));
  let p = 0;
  for (const x of semua) {
    hasil.set(x, p);
    p += x.length;
  }
  return hasil;
}

const escXml = (s: string) =>
  s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function hurufKolom(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
const NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

/**
 * File .xlsx satu sheet. Semua kolom berformat Teks (@) agar NIK dan rekening tidak berubah menjadi
 * angka (nol di depan hilang). Baris pertama dianggap judul kolom (tebal).
 * kompres (opsional, mis. zlib.deflateRawSync di Node) membuat file sekecil ekspor Excel biasa.
 */
export function buatXlsx(namaSheet: string, tabel: string[][], kompres?: (d: Uint8Array) => Uint8Array): Uint8Array {
  const lebar = Math.max(1, ...tabel.map((b) => b.length));
  const baris = tabel
    .map(
      (b, r) =>
        `<row r="${r + 1}">` +
        b.map((v, c) => `<c r="${hurufKolom(c)}${r + 1}" t="inlineStr" s="${r === 0 ? 2 : 1}"><is><t xml:space="preserve">${escXml(v)}</t></is></c>`).join("") +
        "</row>",
    )
    .join("");
  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  return buatZip([
    [
      "[Content_Types].xml",
      `${xml}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    ],
    ["_rels/.rels", `${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `${xml}<workbook ${NS} xmlns:r="${NS_REL}"><sheets><sheet name="${escXml(namaSheet.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    [
      "xl/_rels/workbook.xml.rels",
      `${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NS_REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${NS_REL}/styles" Target="styles.xml"/></Relationships>`,
    ],
    [
      "xl/styles.xml",
      `${xml}<styleSheet ${NS}><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="49" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
    ],
    ["xl/worksheets/sheet1.xml", `${xml}<worksheet ${NS}><cols><col min="1" max="${lebar}" width="24" style="1" customWidth="1"/></cols><sheetData>${baris}</sheetData></worksheet>`],
  ], kompres);
}
