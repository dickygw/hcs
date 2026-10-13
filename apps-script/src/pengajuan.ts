/**
 * Pengajuan karyawan (PRD 5.1–5.8): draf, dokumen, TAD, kirim, batalkan, detail.
 * Semua fungsi menerima Gudang (akses data) agar dapat dites dengan data di memori.
 * Kepemilikan diperiksa di setiap fungsi (AKSES-02); rekening TAD tidak pernah dikirim ke karyawan (AKSES-04).
 */
import type { Pemanggil } from "./akses";
import { GalatPengguna } from "./akses";
import { golonganDari, jgEfektif } from "./master";
import type { Baris, NamaTabel } from "./skema";

export interface Gudang {
  baca<T extends NamaTabel>(t: T): Baris<T>[];
  tambah<T extends NamaTabel>(t: T, daftar: Partial<Baris<T>>[]): void;
  ubah<T extends NamaTabel>(t: T, indeks: number, objek: Partial<Baris<T>>): void;
  gantiSemua<T extends NamaTabel>(t: T, daftar: Partial<Baris<T>>[]): void;
  kunci<R>(fn: () => R): R;
  kini(): string;
  id(): string;
  /** Penghitung nomor per awalan; dipanggil di dalam kunci. */
  nomorBerikut(awalan: string): number;
  file: {
    simpan(nomor: string, namaAcak: string, tipe: string, isi: Uint8Array): string;
    hapus(idFile: string): void;
    /** Isi file sebagai base64. */
    ambil(idFile: string): string;
  };
}

export type Status = "draf" | "dikirim" | "diproses" | "perlu_revisi" | "selesai" | "ditolak" | "dibatalkan";
/** Status yang "memakai" TAD pada satu Nomor Surat Tugas (PRD 5.4). */
const STATUS_AKTIF: readonly string[] = ["dikirim", "diproses", "perlu_revisi", "selesai"];
const BISA_DIEDIT: readonly string[] = ["draf", "perlu_revisi"];
const BISA_DIBATALKAN: readonly string[] = ["draf", "dikirim"];

export const ISIAN = ["no_surat_tugas", "kota_tujuan", "tgl_berangkat", "tgl_kembali", "menginap", "jarak", "moda_transportasi", "kendaraan_dinas"] as const;
export type Isian = Record<(typeof ISIAN)[number], string>;
export const JENIS_DOKUMEN = ["surat_tugas", "kuitansi_hotel", "kuitansi_transportasi", "formulir"] as const;
const PILIHAN: Partial<Record<keyof Isian, readonly string[]>> = {
  menginap: ["ya", "tidak"],
  jarak: ["30_60", "60"],
  moda_transportasi: ["pesawat", "kapal", "kereta", "darat"],
  kendaraan_dinas: ["ya", "tidak"],
};
/**
 * Konfigurasi per jenis layanan (PRD 5.1): satu mesin form, beda label surat dasar.
 * Klaim Perdin Diklat memakai Nomor Surat Pemanggilan Workshop/Diklat, disimpan di kolom no_surat_tugas.
 * Layanan yang belum dibangun tidak ada di sini sehingga ditolak server.
 */
export const KONFIG_LAYANAN: Readonly<Record<string, { surat: string; singkat: string; bukti: boolean }>> = {
  klaim_perdin: { surat: "Surat Tugas", singkat: "No. ST", bukti: true },
  klaim_perdin_diklat: { surat: "Surat Pemanggilan", singkat: "No. Surat Pemanggilan", bukti: true },
  // Permohonan SPPD diajukan sebelum berangkat: tanpa langkah Bukti (Design Brief 5.1).
  permohonan_sppd: { surat: "Surat Tugas", singkat: "No. ST", bukti: false },
};
export const LAYANAN_AKTIF: readonly string[] = Object.keys(KONFIG_LAYANAN);
export const konfig = (jenis: string) => KONFIG_LAYANAN[jenis] ?? KONFIG_LAYANAN.klaim_perdin!;

const NAMA_DOKUMEN: Record<string, string> = { kuitansi_hotel: "Kuitansi hotel", kuitansi_transportasi: "Kuitansi transportasi", formulir: "Formulir pengajuan" };
/** Nama dokumen untuk layar; dokumen surat dasar mengikuti jenis layanan. */
export const namaDokumen = (jenis: string, kode: string) => (kode === "surat_tugas" ? konfig(jenis).surat : (NAMA_DOKUMEN[kode] ?? kode));
export const MAKS_TAD = 20;
export const MAKS_FILE = 5 * 1024 * 1024;

const salah = (pesan: string) => new GalatPengguna(pesan);
const teks = (v: unknown, maks: number) => String(v ?? "").trim().slice(0, maks);
const normalST = (s: string) => s.toUpperCase().replace(/\s+/g, "");
export const samarNik = (nik: string) => (nik.length > 8 ? nik.slice(0, 4) + "xxxx" + nik.slice(-4) : nik);

// ---------------------------------------------------------------------------
// Validasi isian (INPUT-01). Draf: format saja, boleh kosong. Kirim: lengkap.
// ---------------------------------------------------------------------------
export function bersihkanIsian(arg: unknown): Isian {
  const a = (arg ?? {}) as Record<string, unknown>;
  const o = {} as Isian;
  for (const k of ISIAN) o[k] = teks(a[k], k === "kota_tujuan" ? 100 : 60);
  for (const [k, boleh] of Object.entries(PILIHAN) as [keyof Isian, readonly string[]][]) if (o[k] && !boleh.includes(o[k])) o[k] = "";
  for (const k of ["tgl_berangkat", "tgl_kembali"] as const) if (o[k] && !tanggalSah(o[k])) o[k] = "";
  if (o.menginap === "ya") o.jarak = "";
  return o;
}

function tanggalSah(t: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  const d = new Date(t + "T00:00:00Z");
  return !isNaN(+d) && d.toISOString().slice(0, 10) === t && d.getUTCFullYear() >= 2020 && d.getUTCFullYear() <= 2100;
}

/** Galat per kolom; kosong = lengkap. Pesan mengikuti Design Brief 8. */
export function periksaIsian(o: Isian, jenis = "klaim_perdin"): Partial<Record<keyof Isian, string>> {
  const g: Partial<Record<keyof Isian, string>> = {};
  const surat = konfig(jenis).surat;
  if (!o.no_surat_tugas) g.no_surat_tugas = `Isi nomor ${surat}.`;
  else if (o.no_surat_tugas.length < 3 || !/^[A-Za-z0-9./\-_ ]+$/.test(o.no_surat_tugas)) g.no_surat_tugas = `Nomor ${surat} hanya berisi huruf, angka, titik, garis miring, dan tanda hubung.`;
  if (o.kota_tujuan.length < 2) g.kota_tujuan = "Isi kota atau unit tujuan.";
  if (!o.tgl_berangkat) g.tgl_berangkat = "Isi tanggal berangkat.";
  if (!o.tgl_kembali) g.tgl_kembali = "Isi tanggal kembali.";
  else if (o.tgl_berangkat && o.tgl_kembali < o.tgl_berangkat) g.tgl_kembali = "Tanggal kembali sebelum tanggal berangkat.";
  if (!o.menginap) g.menginap = "Pilih menginap atau tidak.";
  if (o.menginap === "tidak" && !o.jarak) g.jarak = "Pilih jarak perjalanan.";
  if (!o.moda_transportasi) g.moda_transportasi = "Pilih moda transportasi.";
  if (!o.kendaraan_dinas) g.kendaraan_dinas = "Pilih apakah memakai kendaraan dinas.";
  return g;
}

/**
 * Dokumen wajib (PRD 5.3): Surat Tugas, formulir, kuitansi hotel bila menginap, kuitansi transportasi bila tanpa
 * kendaraan dinas. Layanan tanpa langkah Bukti (Permohonan SPPD) hanya mewajibkan Surat Tugas.
 */
export function dokumenWajib(o: Isian, jenis = "klaim_perdin"): string[] {
  if (!konfig(jenis).bukti) return ["surat_tugas"];
  const w = ["surat_tugas", "formulir"];
  if (o.menginap === "ya") w.push("kuitansi_hotel");
  if (o.kendaraan_dinas !== "ya") w.push("kuitansi_transportasi");
  return w;
}

/** FILE-01: jenis file dari isi (magic bytes), bukan dari nama. */
export function jenisFile(b: Uint8Array): { tipe: string; ekstensi: string } | null {
  const awal = (...x: number[]) => x.every((v, i) => b[i] === v);
  if (awal(0x25, 0x50, 0x44, 0x46, 0x2d)) return { tipe: "application/pdf", ekstensi: "pdf" };
  if (awal(0xff, 0xd8, 0xff)) return { tipe: "image/jpeg", ekstensi: "jpg" };
  if (awal(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { tipe: "image/png", ekstensi: "png" };
  return null;
}

// ---------------------------------------------------------------------------
// Pembantu
// ---------------------------------------------------------------------------
function cariMilik(g: Gudang, nomor: unknown, p: Pemanggil) {
  const semua = g.baca("pengajuan");
  const i = semua.findIndex((x) => x.nomor === String(nomor ?? ""));
  // Pengajuan orang lain dilaporkan sama dengan "tidak ada" agar nomor milik orang lain tidak dapat ditebak.
  if (i < 0 || semua[i]!.pemilik_email !== p.email) throw salah("Pengajuan tidak ditemukan.");
  return { i, x: semua[i]! };
}

function karyawanDari(g: Gudang, email: string) {
  const k = g.baca("karyawan").find((x) => x.prim_email === email && x.aktif === "ya");
  if (!k) throw salah("Data karyawan Anda tidak ditemukan. Hubungi Admin SDM.");
  return k;
}

/** TAD yang sudah dipakai pada Nomor Surat Tugas ini oleh pengajuan aktif lain → nomor pengajuannya. */
export function tadTerpakai(g: Gudang, noSt: string, kecuali: string): Record<string, string> {
  if (!noSt) return {};
  const st = normalST(noSt);
  const aktif = new Set(g.baca("pengajuan").filter((x) => x.nomor !== kecuali && STATUS_AKTIF.includes(x.status)).map((x) => x.nomor));
  const hasil: Record<string, string> = {};
  for (const t of g.baca("pengajuan_tad")) if (t.aktif === "ya" && aktif.has(t.nomor_pengajuan) && normalST(t.no_surat_tugas) === st) hasil[t.tad_id] = t.nomor_pengajuan;
  return hasil;
}

const tampilTad = (t: Baris<"tad">) => ({ id: t.id, nama: t.nama, nik: samarNik(t.nik), vendor: t.vendor, unit: t.unit_kerja, belumTerverifikasi: t.terverifikasi !== "ya" });

/** Daftar saran TAD untuk dicari di perangkat (PRD 5.7): tanpa rekening dalam bentuk apa pun. */
export function saranTad(g: Gudang) {
  return g.baca("tad").filter((t) => t.aktif === "ya").map(tampilTad);
}

// ---------------------------------------------------------------------------
// Draf
// ---------------------------------------------------------------------------
interface TadKiriman {
  id?: unknown;
  baru?: { nama?: unknown; nik?: unknown; vendor?: unknown };
}

export function simpanDraf(g: Gudang, p: Pemanggil, arg: unknown) {
  const a = (arg ?? {}) as { nomor?: unknown; jenis?: unknown; isian?: unknown; tad?: unknown };
  const isian = bersihkanIsian(a.isian);
  return g.kunci(() => {
    const kini = g.kini();
    let nomor = String(a.nomor ?? "");
    if (!nomor) {
      const jenis = String(a.jenis ?? "");
      const layanan = g.baca("jenis_layanan").find((l) => l.kode === jenis && l.aktif === "ya");
      if (!layanan || !LAYANAN_AKTIF.includes(jenis)) throw salah("Jenis layanan tidak tersedia.");
      const k = karyawanDari(g, p.email);
      nomor = `${layanan.awalan_nomor}-${String(g.nomorBerikut(layanan.awalan_nomor)).padStart(4, "0")}`;
      g.tambah("pengajuan", [{ nomor, jenis_layanan: jenis, nik_pendek: k.nik_pendek, pemilik_email: p.email, status: "draf", ...isian, dibuat_pada: kini, diperbarui_pada: kini }]);
    } else {
      const { i, x } = cariMilik(g, nomor, p);
      if (!BISA_DIEDIT.includes(x.status)) throw salah("Pengajuan ini tidak dapat diubah lagi.");
      g.ubah("pengajuan", i, { ...x, ...isian, diperbarui_pada: kini });
    }
    if (Array.isArray(a.tad)) gantiTadDraf(g, nomor, a.tad as TadKiriman[], kini);
    return { nomor, tersimpanPada: kini, tad: tadPengajuan(g, nomor), terpakai: tadTerpakai(g, isian.no_surat_tugas, nomor) };
  });
}

function gantiTadDraf(g: Gudang, nomor: string, daftar: TadKiriman[], kini: string) {
  if (daftar.length > MAKS_TAD) throw salah(`Maksimal ${MAKS_TAD} TAD per pengajuan.`);
  const master = g.baca("tad");
  const ids: string[] = [];
  for (const t of daftar) {
    if (t.baru) {
      // PRD 5.7 (4): TAD belum terdaftar masuk data master sebagai input manual, belum terverifikasi.
      const nama = teks(t.baru.nama, 100);
      const nik = teks(t.baru.nik, 20).replace(/\D/g, "");
      if (nama.length < 3) throw salah("Isi nama TAD minimal 3 huruf.");
      if (nik && nik.length !== 16) throw salah("NIK TAD harus 16 digit atau dikosongkan.");
      const ada = nik ? master.find((m) => m.nik === nik) : undefined;
      if (ada) ids.push(ada.id);
      else {
        const baru = {
          id: g.id(), nik, nama, nama_bank: "", rekening_terenkripsi: "", vendor: teks(t.baru.vendor, 40), unit_kerja: "",
          tgl_akhir_kontrak: "", sumber_data: "input_manual", terverifikasi: "tidak", aktif: "ya", dibuat_pada: kini, diperbarui_pada: kini,
        };
        g.tambah("tad", [baru]);
        master.push(baru);
        ids.push(baru.id);
      }
    } else {
      const id = String(t.id ?? "");
      if (!master.some((m) => m.id === id && m.aktif === "ya")) throw salah("TAD tidak ditemukan di data master.");
      ids.push(id);
    }
  }
  if (new Set(ids).size !== ids.length) throw salah("TAD yang sama ditambahkan lebih dari sekali.");
  const lain = g.baca("pengajuan_tad").filter((t) => t.nomor_pengajuan !== nomor);
  g.gantiSemua("pengajuan_tad", [...lain, ...ids.map((tad_id) => ({ id: g.id(), nomor_pengajuan: nomor, tad_id, aktif: "ya", dibuat_pada: kini, diperbarui_pada: kini }))]);
}

function tadPengajuan(g: Gudang, nomor: string) {
  const master = new Map(g.baca("tad").map((t) => [t.id, t]));
  return g
    .baca("pengajuan_tad")
    .filter((t) => t.nomor_pengajuan === nomor && t.aktif === "ya")
    .map((t) => {
      const m = master.get(t.tad_id);
      return { ...(m ? tampilTad(m) : { id: t.tad_id, nama: "-", nik: "", vendor: "", unit: "", belumTerverifikasi: true }), nominal: t.nominal_disetujui };
    });
}

// ---------------------------------------------------------------------------
// Dokumen (FILE-01..05)
// ---------------------------------------------------------------------------
export function unggahDokumen(g: Gudang, p: Pemanggil, arg: unknown, dariBase64: (s: string) => Uint8Array) {
  const a = (arg ?? {}) as { nomor?: unknown; jenis?: unknown; nama?: unknown; data?: unknown };
  const jenis = String(a.jenis ?? "");
  if (!(JENIS_DOKUMEN as readonly string[]).includes(jenis)) throw salah("Jenis dokumen tidak dikenal.");
  const data = String(a.data ?? "");
  if (data.length > Math.ceil(MAKS_FILE / 3) * 4 + 4) throw salah("Ukuran file melebihi 5 MB. Perkecil file lalu unggah kembali.");
  const isi = dariBase64(data);
  if (isi.length > MAKS_FILE) throw salah("Ukuran file melebihi 5 MB. Perkecil file lalu unggah kembali.");
  const j = jenisFile(isi);
  if (!j) throw salah("Unggah file PDF, JPG, atau PNG.");
  const { x } = cariMilik(g, a.nomor, p);
  if (!BISA_DIEDIT.includes(x.status)) throw salah("Pengajuan ini tidak dapat diubah lagi.");

  const id = g.id();
  const idFile = g.file.simpan(x.nomor, `${id}.${j.ekstensi}`, j.tipe, isi); // nama acak (FILE-03)
  const baris = { id, nomor_pengajuan: x.nomor, jenis, nama_asli: teks(a.nama, 120), id_file_drive: idFile, tipe_mime: j.tipe, ukuran_byte: String(isi.length), pemilik_email: p.email, dibuat_pada: g.kini() };
  g.kunci(() => g.tambah("dokumen", [baris]));
  return tampilDokumen(baris);
}

const tampilDokumen = (d: Baris<"dokumen">) => ({ id: d.id, jenis: d.jenis, nama: d.nama_asli, tipe: d.tipe_mime, ukuran: +d.ukuran_byte });

function cariDokumen(g: Gudang, p: Pemanggil, id: unknown) {
  const d = g.baca("dokumen").find((x) => x.id === String(id ?? ""));
  const pj = d && g.baca("pengajuan").find((x) => x.nomor === d.nomor_pengajuan);
  if (!d || !pj || pj.pemilik_email !== p.email) throw salah("Dokumen tidak ditemukan."); // FILE-04
  return { d, pj };
}

export function hapusDokumen(g: Gudang, p: Pemanggil, arg: unknown) {
  const { d, pj } = cariDokumen(g, p, (arg as { id?: unknown } | null)?.id);
  if (!BISA_DIEDIT.includes(pj.status)) throw salah("Pengajuan ini tidak dapat diubah lagi.");
  g.kunci(() => g.gantiSemua("dokumen", g.baca("dokumen").filter((x) => x.id !== d.id)));
  g.file.hapus(d.id_file_drive);
  return { ok: true };
}

export function unduhDokumen(g: Gudang, p: Pemanggil, arg: unknown) {
  const { d } = cariDokumen(g, p, (arg as { id?: unknown } | null)?.id);
  return { nama: d.nama_asli, tipe: d.tipe_mime, data: g.file.ambil(d.id_file_drive) };
}

// ---------------------------------------------------------------------------
// Kirim, batalkan
// ---------------------------------------------------------------------------
export function kirimPengajuan(g: Gudang, p: Pemanggil, arg: unknown) {
  const a = (arg ?? {}) as { nomor?: unknown; pernyataanTad?: unknown };
  return g.kunci(() => {
    const { i, x } = cariMilik(g, a.nomor, p);
    if (!BISA_DIEDIT.includes(x.status)) throw salah("Pengajuan ini sudah dikirim.");
    const isian = bersihkanIsian(x);
    const galat = periksaIsian(isian, x.jenis_layanan);
    if (Object.keys(galat).length) throw salah("Lengkapi isian: " + Object.values(galat).join(" "));
    const ada = new Set(g.baca("dokumen").filter((d) => d.nomor_pengajuan === x.nomor).map((d) => d.jenis));
    const kurang = dokumenWajib(isian, x.jenis_layanan).filter((j) => !ada.has(j));
    if (kurang.length) throw salah("Unggah dokumen: " + kurang.map((j) => namaDokumen(x.jenis_layanan, j)).join(", ") + ".");

    const kini = g.kini();
    const semuaTad = g.baca("pengajuan_tad");
    const milik = semuaTad.filter((t) => t.nomor_pengajuan === x.nomor && t.aktif === "ya");
    if (milik.length && a.pernyataanTad !== true) throw salah(`Centang pernyataan bahwa data TAD sesuai dengan ${konfig(x.jenis_layanan).surat}.`);
    // PRD 5.4: satu TAD hanya sekali per Nomor Surat Tugas; diperiksa ulang di dalam kunci (INPUT-05).
    const terpakai = tadTerpakai(g, isian.no_surat_tugas, x.nomor);
    const master = new Map(g.baca("tad").map((t) => [t.id, t]));
    for (const t of milik) {
      if (terpakai[t.tad_id]) throw salah(`TAD ${master.get(t.tad_id)?.nama ?? ""} sudah diajukan dalam pengajuan ${terpakai[t.tad_id]}.`);
    }
    // PRD 5.6: salin dan kunci data karyawan serta bank dan rekening TAD (tetap terenkripsi).
    const k = karyawanDari(g, p.email);
    const jg = jgEfektif(k);
    g.ubah("pengajuan", i, {
      ...x, ...isian, status: "dikirim", pernyataan_tad: milik.length ? "ya" : "", dikirim_pada: kini, diperbarui_pada: kini,
      jg_terkunci: jg, golongan_terkunci: golonganDari(jg), jabatan_terkunci: k.position_name, unit_kerja_terkunci: k.nama_unit_kerja,
    });
    if (milik.length) {
      g.gantiSemua("pengajuan_tad", semuaTad.map((t) => {
        if (t.nomor_pengajuan !== x.nomor || t.aktif !== "ya") return t;
        const m = master.get(t.tad_id);
        const rek = m?.rekening_terenkripsi ?? "";
        return { ...t, no_surat_tugas: isian.no_surat_tugas, nama_bank_terkunci: m?.nama_bank ?? "", rekening_terkunci: rek, status_rekening: rek ? "lengkap" : "kosong", diperbarui_pada: kini };
      }));
    }
    g.tambah("riwayat_status", [{ id: g.id(), nomor_pengajuan: x.nomor, status_dari: x.status, status_ke: "dikirim", oleh_email: p.email, catatan: x.status === "perlu_revisi" ? "Dikirim ulang" : "", pada: kini }]);
    return { nomor: x.nomor };
  });
}

export function batalkanPengajuan(g: Gudang, p: Pemanggil, arg: unknown) {
  return g.kunci(() => {
    const { i, x } = cariMilik(g, (arg as { nomor?: unknown } | null)?.nomor, p);
    if (!BISA_DIBATALKAN.includes(x.status)) throw salah("Pengajuan yang sudah diproses tidak dapat dibatalkan.");
    const kini = g.kini();
    g.ubah("pengajuan", i, { ...x, status: "dibatalkan", diperbarui_pada: kini });
    // TAD di pengajuan yang dibatalkan dilepas agar dapat diajukan di pengajuan lain.
    g.gantiSemua("pengajuan_tad", g.baca("pengajuan_tad").map((t) => (t.nomor_pengajuan === x.nomor ? { ...t, aktif: "tidak", diperbarui_pada: kini } : t)));
    g.tambah("riwayat_status", [{ id: g.id(), nomor_pengajuan: x.nomor, status_dari: x.status, status_ke: "dibatalkan", oleh_email: p.email, catatan: "", pada: kini }]);
    return { ok: true };
  });
}

// ---------------------------------------------------------------------------
// Baca: daftar (K1) dan detail (K4) — satu panggilan per layar (PRD 9.1 #3)
// ---------------------------------------------------------------------------

function catatanTerakhir(riwayat: Baris<"riwayat_status">[], nomor: string) {
  return riwayat.filter((r) => r.nomor_pengajuan === nomor).sort((a, b) => a.pada.localeCompare(b.pada));
}

// ponytail: semua pengajuan milik sendiri dikirim sekaligus (biasanya puluhan); halaman bila arsip belum cukup.
export function pengajuanSaya(g: Gudang, p: Pemanggil) {
  const layanan = new Map(g.baca("jenis_layanan").map((l) => [l.kode, l.nama]));
  const riwayat = g.baca("riwayat_status");
  return g
    .baca("pengajuan")
    .filter((x) => x.pemilik_email === p.email)
    .map((x) => {
      const r = catatanTerakhir(riwayat, x.nomor).at(-1);
      return {
        nomor: x.nomor, jenis: x.jenis_layanan, namaLayanan: layanan.get(x.jenis_layanan) ?? x.jenis_layanan, status: x.status,
        noSuratTugas: x.no_surat_tugas, kota: x.kota_tujuan, tglBerangkat: x.tgl_berangkat, tglKembali: x.tgl_kembali,
        diperbaruiPada: x.diperbarui_pada, catatan: r && r.status_ke === x.status ? r.catatan : "",
      };
    })
    .sort((a, b) => b.diperbaruiPada.localeCompare(a.diperbaruiPada));
}

export function bukaPengajuan(g: Gudang, p: Pemanggil, arg: unknown) {
  const { x } = cariMilik(g, (arg as { nomor?: unknown } | null)?.nomor, p);
  const nama = new Map(g.baca("karyawan").map((k) => [k.prim_email, k.nama]));
  const riwayat = catatanTerakhir(g.baca("riwayat_status"), x.nomor).map((r) => ({
    status: r.status_ke, pada: r.pada, oleh: nama.get(r.oleh_email) ?? r.oleh_email.split("@")[0], catatan: r.catatan,
  }));
  const tad = tadPengajuan(g, x.nomor);
  const selesai = x.status === "selesai";
  return {
    nomor: x.nomor,
    jenis: x.jenis_layanan,
    namaLayanan: g.baca("jenis_layanan").find((l) => l.kode === x.jenis_layanan)?.nama ?? x.jenis_layanan,
    status: x.status,
    isian: bersihkanIsian(x),
    riwayat,
    dokumen: g.baca("dokumen").filter((d) => d.nomor_pengajuan === x.nomor).map(tampilDokumen),
    // Nominal hanya setelah Selesai (PRD 5.8); tanpa rincian tarif atau rumus.
    tad: tad.map((t) => ({ ...t, nominal: selesai ? t.nominal : "" })),
    nominal: selesai ? x.nominal_disetujui : "",
    bisaEdit: BISA_DIEDIT.includes(x.status),
    bisaBatal: BISA_DIBATALKAN.includes(x.status),
    terpakai: BISA_DIEDIT.includes(x.status) ? tadTerpakai(g, x.no_surat_tugas, x.nomor) : {},
  };
}
