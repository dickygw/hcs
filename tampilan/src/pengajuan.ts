// Jenis data dan pembantu tampilan pengajuan karyawan (K1–K4).
import type { Isian } from "../../apps-script/src/pengajuan";

export type { Isian };
export { konfig, namaDokumen } from "../../apps-script/src/pengajuan";

/** "Surat Tugas" → "Surat tugas" untuk judul (huruf kapital hanya di awal). */
export const kalimat = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();
export type Status = "draf" | "dikirim" | "diproses" | "perlu_revisi" | "selesai" | "ditolak" | "dibatalkan";

export interface Ringkas {
  nomor: string;
  jenis: string;
  namaLayanan: string;
  status: Status;
  noSuratTugas: string;
  kota: string;
  tglBerangkat: string;
  tglKembali: string;
  diperbaruiPada: string;
  catatan: string;
}
export interface Dokumen {
  id: string;
  jenis: string;
  nama: string;
  tipe: string;
  ukuran: number;
}
export interface Tad {
  id: string;
  nama: string;
  nik: string;
  vendor: string;
  unit: string;
  belumTerverifikasi: boolean;
}
export interface Detail {
  nomor: string;
  jenis: string;
  namaLayanan: string;
  status: Status;
  isian: Isian;
  riwayat: { status: Status; pada: string; oleh: string; catatan: string }[];
  dokumen: Dokumen[];
  tad: (Tad & { nominal: string })[];
  nominal: string;
  bisaEdit: boolean;
  bisaBatal: boolean;
  terpakai: Record<string, string>;
}

export const LABEL_STATUS: Record<Status, string> = {
  draf: "Draf",
  dikirim: "Dikirim",
  diproses: "Diproses",
  perlu_revisi: "Perlu revisi",
  selesai: "Selesai",
  ditolak: "Ditolak",
  dibatalkan: "Dibatalkan",
};

export const LAYANAN = [
  { kode: "klaim_perdin", awalan: "KP", nama: "Klaim Biaya Perdin", info: "Klaim uang harian dan biaya perjalanan setelah dinas selesai.", aktif: true },
  { kode: "klaim_perdin_diklat", awalan: "KD", nama: "Klaim Perdin Diklat", info: "Klaim perjalanan untuk workshop atau diklat dengan Surat Pemanggilan.", aktif: true },
  { kode: "permohonan_sppd", awalan: "SP", nama: "Permohonan SPPD", info: "Ajukan SPPD sebelum berangkat berdasarkan Surat Tugas.", aktif: true },
  { kode: "pemesanan_tiket", awalan: "TP", nama: "Pemesanan Tiket Pesawat", info: "Minta Admin SDM memesankan tiket sesuai rute dan tanggal tugas.", aktif: false },
];

export const LABEL_MODA: Record<string, string> = { pesawat: "Pesawat", kapal: "Kapal", kereta: "Kereta", darat: "Darat" };

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const bagian = (t: string) => t.split("-").map(Number) as [number, number, number];

/** 6 Okt 2026 */
export function tanggal(t: string) {
  if (!t) return "-";
  const [y, m, d] = bagian(t.slice(0, 10));
  return `${d} ${BULAN[m - 1]} ${y}`;
}

/** 6–8 Okt 2026, 30 Sep–2 Okt 2026 */
export function rentang(a: string, b: string) {
  if (!a) return "";
  if (!b || a === b) return tanggal(a);
  const [y1, m1, d1] = bagian(a);
  const [y2, m2, d2] = bagian(b);
  if (y1 !== y2) return `${tanggal(a)}–${tanggal(b)}`;
  if (m1 !== m2) return `${d1} ${BULAN[m1 - 1]}–${d2} ${BULAN[m2 - 1]} ${y2}`;
  return `${d1}–${d2} ${BULAN[m2 - 1]} ${y2}`;
}

/** Zona WITA (Asia/Makassar) untuk waktu dari server. */
const wita = (iso: string) => new Date(new Date(iso).getTime() + 8 * 3_600_000);
export const jam = (iso: string) => {
  const d = wita(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}.${String(d.getUTCMinutes()).padStart(2, "0")}`;
};
export const waktuLengkap = (iso: string) => `${tanggal(wita(iso).toISOString())}, ${jam(iso)} WITA`;
export const waktuPendek = (iso: string) => {
  const d = wita(iso);
  return `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]}, ${jam(iso)}`;
};

/** "2 jam lalu", "Kemarin", "5 Okt" */
export function relatif(iso: string, kini = Date.now()) {
  const selisih = kini - new Date(iso).getTime();
  if (selisih < 60_000) return "Baru saja";
  if (selisih < 3_600_000) return `${Math.floor(selisih / 60_000)} menit lalu`;
  const hari = (t: number) => Math.floor((t + 8 * 3_600_000) / 86_400_000);
  const beda = hari(kini) - hari(new Date(iso).getTime());
  if (beda === 0) return `${Math.floor(selisih / 3_600_000)} jam lalu`;
  if (beda === 1) return "Kemarin";
  const d = wita(iso);
  return `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]}`;
}

export const rupiah = (n: string | number) => "Rp" + Math.round(Number(n) || 0).toLocaleString("id-ID");
export const ukuran = (b: number) => (b >= 1_000_000 ? `${(b / 1_048_576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

// ---------------------------------------------------------------------------
// Berkas: periksa, perkecil foto di perangkat (PRD 7.2), base64 untuk dikirim
// ---------------------------------------------------------------------------
export const MAKS_FILE = 5 * 1024 * 1024;
const TIPE_BOLEH = ["application/pdf", "image/jpeg", "image/png"];
const SISI_MAKS = 2000;

/** Foto besar diperkecil menjadi JPEG ≤ 2000 px. PDF dan foto kecil dikirim apa adanya. */
async function perkecil(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.size < 800_000) return file;
  try {
    const gambar = await createImageBitmap(file);
    const skala = Math.min(1, SISI_MAKS / Math.max(gambar.width, gambar.height));
    const kanvas = document.createElement("canvas");
    kanvas.width = Math.round(gambar.width * skala);
    kanvas.height = Math.round(gambar.height * skala);
    kanvas.getContext("2d")!.drawImage(gambar, 0, 0, kanvas.width, kanvas.height);
    const hasil = await new Promise<Blob | null>((ok) => kanvas.toBlob(ok, "image/jpeg", 0.85));
    return hasil && hasil.size < file.size ? hasil : file;
  } catch {
    return file;
  }
}

function keBase64(b: Blob): Promise<string> {
  return new Promise((ok, gagal) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).replace(/^data:[^,]*,/, ""));
    r.onerror = () => gagal(new Error("File tidak dapat dibaca."));
    r.readAsDataURL(b);
  });
}

/** Pemeriksaan awal di perangkat (Design Brief 6); server tetap memeriksa isi file (FILE-01, FILE-02). */
export async function siapkanFile(file: File): Promise<{ data: string; ukuran: number } | { galat: string }> {
  if (!TIPE_BOLEH.includes(file.type) && !/\.(pdf|jpe?g|png)$/i.test(file.name)) return { galat: "Unggah file PDF, JPG, atau PNG." };
  const blob = await perkecil(file);
  if (blob.size > MAKS_FILE) return { galat: "Ukuran file melebihi 5 MB. Perkecil file lalu unggah kembali." };
  return { data: await keBase64(blob), ukuran: blob.size };
}

export const dariBase64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
