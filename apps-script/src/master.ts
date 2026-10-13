/**
 * Data master: sinkronisasi HCMS dan unggah TAD (PRD 6.1–6.4). Fungsi murni, dites di laptop.
 * Browser membaca file dan hanya mengirim kolom yang dipakai; server tetap memvalidasi ulang (INPUT-01)
 * dan hanya mengambil 12 kolom HCMS (DATA-05). Rekening tidak pernah dikembalikan utuh (AKSES-04).
 */
import { GalatPengguna } from "./akses";
import type { Baris } from "./skema";

export const MAKS_BARIS = 5000;
const MAKS_PANJANG = 200;

/** Header ekspor HCMS → kolom tabel karyawan. Hanya 12 kolom ini yang boleh tersimpan (PRD 6.1). */
export const KOLOM_HCMS = {
  "NIK PENDEK": "nik_pendek",
  NAMA: "nama",
  "PRIM EMAIL": "prim_email",
  "EMP TYPE NAME": "emp_type_name",
  "KODE JOB GRADE": "kode_job_grade",
  "JOB GRADE DEF": "job_grade_def",
  "POSITION TYPE NAME": "position_type_name",
  "POSITION NAME": "position_name",
  "KODE UNIT KERJA": "kode_unit_kerja",
  "NAMA UNIT KERJA": "nama_unit_kerja",
  "BRANCH NAME": "branch_name",
  "DEP NAME": "dep_name",
} as const;
export type BarisHcms = Record<(typeof KOLOM_HCMS)[keyof typeof KOLOM_HCMS], string>;

/** Template Unggah TAD (PRD 6.3). Template final masih divalidasi ulang (pertanyaan terbuka 2). */
export const KOLOM_TAD = {
  NIK: "nik",
  NAMA: "nama",
  "NAMA BANK": "nama_bank",
  "NOMOR REKENING": "rekening",
  VENDOR: "vendor",
  "UNIT KERJA": "unit_kerja",
  "TANGGAL AKHIR KONTRAK": "tgl_akhir_kontrak",
} as const;
export type BarisTad = Record<(typeof KOLOM_TAD)[keyof typeof KOLOM_TAD], string>;

export interface Masalah {
  baris: number; // nomor baris di file (header = baris 1)
  nik: string;
  nama: string;
  alasan: string;
}

/** Golongan PKB Pasal 52 dari JG jabatan yang dijalankan. JG di bawah 4 (mis. MPP JG 0) butuh koreksi JG. */
export function golonganDari(jg: string): "A" | "B" | "C" | "" {
  const n = Number(jg);
  if (jg.trim() === "" || !Number.isFinite(n)) return "";
  return n >= 14 ? "A" : n >= 11 ? "B" : n >= 4 ? "C" : "";
}
export const jgEfektif = (k: Baris<"karyawan">) => k.jg_perdin_override || k.kode_job_grade;
const labelJg = (jg: string) => (jg ? `JG ${jg} · ${golonganDari(jg) || "-"}` : "-");

/** INPUT-01: kiriman berupa daftar baris; hanya kolom yang dikenal yang diambil, semua sebagai teks pendek. */
function ambilBaris<K extends string>(arg: unknown, kolom: readonly K[]) {
  const a = arg as { namaFile?: unknown; awal?: unknown; baris?: unknown } | null;
  if (!a || typeof a !== "object" || !Array.isArray(a.baris)) throw new GalatPengguna("Isi file tidak terbaca.");
  if (!a.baris.length) throw new GalatPengguna("File tidak berisi data.");
  if (a.baris.length > MAKS_BARIS) throw new GalatPengguna(`File berisi lebih dari ${MAKS_BARIS} baris.`);
  const namaFile = String(a.namaFile ?? "").slice(0, MAKS_PANJANG);
  const awal = Math.max(2, Math.min(100, Math.floor(Number(a.awal) || 2))); // nomor baris data pertama di file
  const baris = a.baris.map((b) => {
    const o = {} as Record<K, string>;
    for (const k of kolom) {
      const v = b && typeof b === "object" ? (b as Record<string, unknown>)[k] : "";
      o[k] = String(v ?? "").trim().slice(0, MAKS_PANJANG);
    }
    return o;
  });
  return { namaFile, awal, baris };
}

// ---------------------------------------------------------------------------
// Sinkronisasi HCMS
// ---------------------------------------------------------------------------
export interface RingkasanHcms {
  namaFile: string;
  jumlahBaris: number;
  masalah: Masalah[];
  baru: { nik: string; nama: string; unit: string }[];
  nonaktif: { nik: string; nama: string; unit: string }[];
  berubahJg: { nik: string; nama: string; jabatan: string; dari: string; ke: string; pindahGolongan: boolean }[];
  pindahUnit: { nik: string; nama: string; dari: string; ke: string }[];
}

/** Bandingkan ekspor HCMS dengan data master. hasil = isi tabel karyawan setelah Terapkan. */
export function sinkronHcms(arg: unknown, lama: Baris<"karyawan">[], kini: string) {
  const { namaFile, awal, baris } = ambilBaris(arg, Object.values(KOLOM_HCMS));
  const masalah: Masalah[] = [];
  const dilihat = new Set<string>();
  const valid: BarisHcms[] = [];
  baris.forEach((b, i) => {
    const m = (alasan: string) => masalah.push({ baris: awal + i, nik: b.nik_pendek, nama: b.nama, alasan });
    if (Object.values(b).every((v) => !v)) return; // baris kosong
    if (!b.nik_pendek) return m("NIK PENDEK kosong");
    if (dilihat.has(b.nik_pendek)) return m("NIK PENDEK ganda");
    dilihat.add(b.nik_pendek);
    if (!b.nama) return m("NAMA kosong");
    if (b.kode_job_grade && !/^\d{1,2}$/.test(b.kode_job_grade)) return m("KODE JOB GRADE bukan angka");
    if (b.prim_email && !/^[^\s@]+@[^\s@]+$/.test(b.prim_email)) return m("PRIM EMAIL tidak valid");
    valid.push({ ...b, prim_email: b.prim_email.toLowerCase() });
  });

  const r: RingkasanHcms = { namaFile, jumlahBaris: baris.length, masalah, baru: [], nonaktif: [], berubahJg: [], pindahUnit: [] };
  const peta = new Map(lama.map((k) => [k.nik_pendek, k]));
  const hasil: Baris<"karyawan">[] = valid.map((b) => {
    const l = peta.get(b.nik_pendek);
    const jgPerdin = l?.jg_perdin_override ?? ""; // koreksi Admin tidak tertimpa sinkronisasi
    if (!l || l.aktif !== "ya") r.baru.push({ nik: b.nik_pendek, nama: b.nama, unit: b.nama_unit_kerja });
    else {
      if (l.kode_job_grade !== b.kode_job_grade) {
        r.berubahJg.push({
          nik: b.nik_pendek, nama: b.nama, jabatan: b.position_name, dari: labelJg(l.kode_job_grade), ke: labelJg(b.kode_job_grade),
          pindahGolongan: golonganDari(l.kode_job_grade) !== golonganDari(b.kode_job_grade),
        });
      }
      if (l.kode_unit_kerja !== b.kode_unit_kerja) r.pindahUnit.push({ nik: b.nik_pendek, nama: b.nama, dari: l.nama_unit_kerja, ke: b.nama_unit_kerja });
    }
    return { ...b, jg_perdin_override: jgPerdin, aktif: "ya", diperbarui_pada: kini };
  });
  for (const l of lama) {
    if (dilihat.has(l.nik_pendek)) continue;
    if (l.aktif === "ya") r.nonaktif.push({ nik: l.nik_pendek, nama: l.nama, unit: l.nama_unit_kerja });
    hasil.push(l.aktif === "ya" ? { ...l, aktif: "tidak", diperbarui_pada: kini } : l); // dinonaktifkan, tidak dihapus
  }
  return { ringkasan: r, hasil };
}

// ---------------------------------------------------------------------------
// Unggah TAD
// ---------------------------------------------------------------------------
/** Tanggal kontrak: yyyy-mm-dd, dd-mm-yyyy, dd/mm/yyyy, atau nomor seri Excel. Tidak dikenal → kosong (PRD 6.3). */
export function rapikanTanggal(t: string): string {
  let d: Date | null = null;
  let m: RegExpExecArray | null;
  const tgl = (y: number, b: number, h: number) => {
    const x = new Date(Date.UTC(y, b - 1, h));
    return x.getUTCMonth() === b - 1 && x.getUTCDate() === h ? x : null; // tolak 31-02, 99-99
  };
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t))) d = tgl(+m[1]!, +m[2]!, +m[3]!);
  else if ((m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(t))) d = tgl(+m[3]!, +m[2]!, +m[1]!);
  else if (/^\d{5}(\.\d+)?$/.test(t)) d = new Date(Date.UTC(1899, 11, 30) + Math.floor(+t) * 86_400_000);
  if (!d || d.getUTCFullYear() < 2000 || d.getUTCFullYear() > 2100) return "";
  return d.toISOString().slice(0, 10);
}

export interface RingkasanTad {
  namaFile: string;
  jumlahBaris: number;
  masalah: Masalah[];
  rekeningKosong: { nik: string; nama: string }[];
  baru: { nik: string; nama: string; vendor: string }[];
  berubah: { nik: string; nama: string; vendor: string }[];
  nonaktif: { nik: string; nama: string; vendor: string }[];
}

/**
 * Bandingkan unggahan TAD dengan data master. Baris bermasalah tidak diimpor, dan TAD yang NIK-nya
 * ada di baris bermasalah tidak dinonaktifkan. TAD input manual tidak dinonaktifkan oleh unggahan.
 * buka/kunci: dekripsi/enkripsi rekening (disuntikkan agar dapat dites).
 */
export function sinkronTad(
  arg: unknown,
  lama: Baris<"tad">[],
  opsi: { kini: string; idBaru: () => string; buka: (s: string) => string; kunci: (t: string) => string },
) {
  const { namaFile, awal, baris } = ambilBaris(arg, Object.values(KOLOM_TAD));
  const masalah: Masalah[] = [];
  const rekeningKosong: RingkasanTad["rekeningKosong"] = [];
  const jumlahNik = new Map<string, number>();
  for (const b of baris) {
    const nik = b.nik.replace(/\D/g, "");
    if (nik) jumlahNik.set(nik, (jumlahNik.get(nik) ?? 0) + 1);
  }

  const valid: BarisTad[] = [];
  baris.forEach((b, i) => {
    const nik = b.nik.replace(/\D/g, "");
    const rekening = b.rekening.replace(/\D/g, ""); // merapikan rekening menjadi angka
    const bank = b.nama_bank.toUpperCase() || (rekening ? "BRI" : "");
    const m = (alasan: string) => masalah.push({ baris: awal + i, nik, nama: b.nama, alasan });
    if (Object.values(b).every((v) => !v)) return; // baris kosong
    if (!/^\d{16}$/.test(nik)) return m("NIK bukan 16 digit");
    if (jumlahNik.get(nik)! > 1) return m("NIK ganda di file");
    if (!b.nama) return m("Nama kosong");
    if (rekening && bank === "BRI" && rekening.length !== 15) return m(`Rekening BRI ${rekening.length} digit, seharusnya 15`);
    if (!rekening) rekeningKosong.push({ nik, nama: b.nama });
    valid.push({ ...b, nik, nama_bank: bank, rekening, tgl_akhir_kontrak: rapikanTanggal(b.tgl_akhir_kontrak) });
  });

  const r: RingkasanTad = { namaFile, jumlahBaris: baris.length, masalah, rekeningKosong, baru: [], berubah: [], nonaktif: [] };
  const peta = new Map(lama.map((t) => [t.nik, t]));
  const hasil: Baris<"tad">[] = valid.map((b) => {
    const l = peta.get(b.nik);
    const rekLama = l?.rekening_terenkripsi ? opsi.buka(l.rekening_terenkripsi) : "";
    const sama = rekLama === b.rekening;
    const isi = {
      nik: b.nik, nama: b.nama, nama_bank: b.nama_bank, vendor: b.vendor, unit_kerja: b.unit_kerja, tgl_akhir_kontrak: b.tgl_akhir_kontrak,
      sumber_data: "unggahan", terverifikasi: "ya", aktif: "ya",
    };
    if (!l || l.aktif !== "ya") r.baru.push({ nik: b.nik, nama: b.nama, vendor: b.vendor });
    else if (!sama || (Object.keys(isi) as (keyof typeof isi)[]).some((k) => l[k] !== isi[k])) r.berubah.push({ nik: b.nik, nama: b.nama, vendor: b.vendor });
    return {
      ...isi,
      id: l?.id || opsi.idBaru(),
      rekening_terenkripsi: sama && l ? l.rekening_terenkripsi : b.rekening ? opsi.kunci(b.rekening) : "",
      dibuat_pada: l?.dibuat_pada || opsi.kini,
      diperbarui_pada: opsi.kini,
    };
  });
  const diimpor = new Set(valid.map((b) => b.nik));
  for (const l of lama) {
    if (diimpor.has(l.nik)) continue;
    const nonaktifkan = l.aktif === "ya" && !jumlahNik.has(l.nik) && l.sumber_data !== "input_manual";
    if (nonaktifkan) r.nonaktif.push({ nik: l.nik, nama: l.nama, vendor: l.vendor });
    hasil.push(nonaktifkan ? { ...l, aktif: "tidak", diperbarui_pada: opsi.kini } : l);
  }
  return { ringkasan: r, hasil };
}

// ---------------------------------------------------------------------------
// Daftar per halaman (PRD 9.1 #2) dan koreksi JG
// ---------------------------------------------------------------------------
export const PER_HALAMAN = 20;

export function halaman<T>(daftar: T[], arg: unknown, teks: (x: T) => string) {
  const a = (arg ?? {}) as { cari?: unknown; halaman?: unknown };
  const cari = String(a.cari ?? "").trim().toLowerCase().slice(0, 100);
  const ke = Math.max(0, Math.min(10_000, Math.floor(Number(a.halaman) || 0)));
  const cocok = cari ? daftar.filter((x) => teks(x).toLowerCase().includes(cari)) : daftar;
  return { total: cocok.length, baris: cocok.slice(ke * PER_HALAMAN, (ke + 1) * PER_HALAMAN) };
}

const urutAktif = <T extends { aktif: string; nama: string }>(a: T, b: T) =>
  (a.aktif === "ya" ? 0 : 1) - (b.aktif === "ya" ? 0 : 1) || a.nama.localeCompare(b.nama);

export function daftarKaryawan(semua: Baris<"karyawan">[], arg: unknown) {
  const h = halaman([...semua].sort(urutAktif), arg, (k) => `${k.nik_pendek} ${k.nama} ${k.position_name} ${k.nama_unit_kerja}`);
  return {
    total: h.total,
    baris: h.baris.map((k) => ({
      nik: k.nik_pendek, nama: k.nama, jabatan: k.position_name, unit: k.nama_unit_kerja,
      jg: k.kode_job_grade, jgPerdin: k.jg_perdin_override, golongan: golonganDari(jgEfektif(k)), aktif: k.aktif === "ya",
    })),
  };
}

/** Rekening hanya keluar dalam bentuk tersamar (PRD 6.4). */
export function daftarTad(semua: Baris<"tad">[], arg: unknown, samar: (terenkripsi: string) => string) {
  const h = halaman([...semua].sort(urutAktif), arg, (t) => `${t.nik} ${t.nama} ${t.vendor} ${t.unit_kerja}`);
  return {
    total: h.total,
    baris: h.baris.map((t) => ({
      nik: t.nik, nama: t.nama, vendor: t.vendor, unit: t.unit_kerja, rekening: t.rekening_terenkripsi ? samar(t.rekening_terenkripsi) : "",
      sumber: t.sumber_data, terverifikasi: t.terverifikasi === "ya", aktif: t.aktif === "ya",
    })),
  };
}

/** Isian koreksi JG untuk Perdin: jg kosong = hapus koreksi; alasan wajib (PRD 5.5). */
export function isianKoreksiJg(arg: unknown) {
  const a = (arg ?? {}) as Record<string, unknown>;
  const nik = String(a.nik ?? "").trim();
  const jg = String(a.jg ?? "").trim();
  const alasan = String(a.alasan ?? "").trim();
  if (!nik || nik.length > 20) throw new GalatPengguna("NIK tidak valid.");
  if (jg && (!/^\d{1,2}$/.test(jg) || +jg < 4 || +jg > 20)) throw new GalatPengguna("JG untuk Perdin harus angka 4 sampai 20.");
  if (alasan.length < 5 || alasan.length > 300) throw new GalatPengguna("Alasan wajib diisi (5 sampai 300 karakter).");
  return { nik, jg, alasan };
}

/** Umur data karyawan untuk indikator (PRD 6.2): hijau < 7 hari, kuning 7–14, merah > 14. */
export function umurData(terakhir: string, kini: Date) {
  if (!terakhir) return { hari: -1, warna: "merah" as const };
  const hari = Math.floor((+kini - +new Date(terakhir)) / 86_400_000);
  return { hari, warna: hari < 7 ? ("hijau" as const) : hari <= 14 ? ("kuning" as const) : ("merah" as const) };
}
