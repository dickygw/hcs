/**
 * Mencocokkan judul kolom file unggahan. Hanya kolom yang dikenal yang dikirim ke server;
 * kolom lain (NIK KTP, NPWP, rekening karyawan, alamat, dll.) tidak pernah meninggalkan perangkat (DATA-05).
 */
import { bacaXlsx } from "./xlsx";

const rapikan = (s: string) => s.toUpperCase().replace(/[_\s]+/g, " ").trim();

export type HasilBaca =
  | { ok: true; namaFile: string; awal: number; jumlahKolom: number; baris: Record<string, string>[] }
  | { ok: false; namaFile: string; pesan: string; hilang: string[] };

/** kolom: judul kolom di file → nama isian. Judul dicari di 20 baris pertama. */
export function petakan(namaFile: string, tabel: string[][], kolom: Record<string, string>): HasilBaca {
  const wajib = Object.keys(kolom);
  let terbaik = { indeks: -1, cocok: -1 };
  tabel.slice(0, 20).forEach((b, i) => {
    const ada = new Set(b.map(rapikan));
    const cocok = wajib.filter((k) => ada.has(k)).length;
    if (cocok > terbaik.cocok) terbaik = { indeks: i, cocok };
  });
  const judul = (tabel[terbaik.indeks] ?? []).map(rapikan);
  const hilang = wajib.filter((k) => !judul.includes(k));
  if (terbaik.cocok <= 0) return { ok: false, namaFile, pesan: "Judul kolom tidak ditemukan. Pastikan file sesuai template.", hilang };
  if (hilang.length) return { ok: false, namaFile, pesan: "Kolom berikut tidak ditemukan atau namanya berbeda:", hilang };

  const posisi = wajib.map((k) => [kolom[k]!, judul.indexOf(k)] as const);
  const baris = tabel.slice(terbaik.indeks + 1).map((b) => Object.fromEntries(posisi.map(([nama, i]) => [nama, (b[i] ?? "").trim()])));
  while (baris.length && Object.values(baris[baris.length - 1]!).every((v) => !v)) baris.pop(); // baris kosong di akhir
  if (!baris.length) return { ok: false, namaFile, pesan: "File tidak berisi data di bawah judul kolom.", hilang: [] };
  return { ok: true, namaFile, awal: terbaik.indeks + 2, jumlahKolom: judul.filter(Boolean).length, baris };
}

export const MAKS_UKURAN_FILE = 10 * 1024 * 1024;

export async function bacaFile(file: File, kolom: Record<string, string>): Promise<HasilBaca> {
  const gagal = (pesan: string): HasilBaca => ({ ok: false, namaFile: file.name, pesan, hilang: [] });
  if (!/\.xlsx$/i.test(file.name)) return gagal("File harus berformat .xlsx. Bila file .xls, buka di Excel lalu simpan sebagai .xlsx.");
  if (file.size > MAKS_UKURAN_FILE) return gagal("Ukuran file lebih dari 10 MB.");
  try {
    return petakan(file.name, await bacaXlsx(new Uint8Array(await file.arrayBuffer())), kolom);
  } catch {
    return gagal("File tidak dapat dibaca. Pastikan file .xlsx tidak rusak atau terkunci kata sandi.");
  }
}

/** Unduh file buatan browser (template kosong). */
export function unduh(namaFile: string, isi: Uint8Array) {
  const url = URL.createObjectURL(new Blob([isi as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = namaFile;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
