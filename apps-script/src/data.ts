/**
 * Satu-satunya modul yang membaca/menulis sheet (WS-07). Menerapkan:
 * - satu kali baca getDataRange().getValues(), olah di memori (PRD 9.1 #1);
 * - cache hanya untuk tabel kecil (skema.ts), dipecah per 90 KB (Tahap 0);
 * - teks diawali = + - @ dinetralkan sebelum ditulis (INPUT-02);
 * - ID spreadsheet dibaca dari Script Properties, tidak pernah dari browser (WS-06).
 */
import { TABEL, type Baris, type NamaTabel, type Spreadsheet } from "./skema";

// ---------------------------------------------------------------------------
// Fungsi murni (dites di laptop)
// ---------------------------------------------------------------------------

/** INPUT-02: teks yang dapat dibaca Sheets sebagai rumus diawali tanda kutip. */
export function netralkan(nilai: unknown): string {
  const teks = nilai == null ? "" : String(nilai);
  return /^[=+\-@\t\r]/.test(teks) ? "'" + teks : teks;
}

export function keBaris<T extends NamaTabel>(tabel: T, objek: Partial<Baris<T>>): string[] {
  return TABEL[tabel].kolom.map((k) => netralkan((objek as Record<string, unknown>)[k]));
}

export function keObjek<T extends NamaTabel>(tabel: T, baris: readonly unknown[]): Baris<T> {
  const o: Record<string, string> = {};
  TABEL[tabel].kolom.forEach((k, i) => (o[k] = baris[i] == null ? "" : String(baris[i])));
  return o as Baris<T>;
}

/** Pecah teks menjadi potongan ≤ ukuran (batas CacheService 100 KB per kunci). */
export function pecah(teks: string, ukuran: number): string[] {
  const hasil: string[] = [];
  for (let i = 0; i < teks.length; i += ukuran) hasil.push(teks.slice(i, i + ukuran));
  return hasil.length ? hasil : [""];
}

// ---------------------------------------------------------------------------
// Akses Google Sheets (berjalan di Apps Script)
// ---------------------------------------------------------------------------
const POTONGAN = 90_000;
const CACHE_DETIK = 21_600; // 6 jam; setiap penulisan lewat modul ini membuang cache tabelnya

export const KUNCI_ID: Record<Spreadsheet, string> = { Master: "ID_SS_MASTER", Data: "ID_SS_DATA", Log: "ID_SS_LOG" };

function sheet_(tabel: NamaTabel) {
  const id = PropertiesService.getScriptProperties().getProperty(KUNCI_ID[TABEL[tabel].spreadsheet]);
  if (!id) throw new Error("Struktur data belum dibuat. Jalankan jalankanMigrasi.");
  const sh = SpreadsheetApp.openById(id).getSheetByName(tabel);
  if (!sh) throw new Error(`Sheet ${tabel} tidak ditemukan.`);
  return sh;
}

/** Semua baris tabel sebagai objek. Satu kali baca (atau dari cache). */
export function baca<T extends NamaTabel>(tabel: T): Baris<T>[] {
  const def = TABEL[tabel];
  const cache = CacheService.getScriptCache();
  if (def.cache) {
    const n = Number(cache.get("n_" + tabel) || 0);
    if (n) {
      const kunci = Array.from({ length: n }, (_, i) => `c_${tabel}_${i}`);
      const isi = cache.getAll(kunci);
      if (Object.keys(isi).length === n) return JSON.parse(kunci.map((k) => isi[k]).join(""));
    }
  }
  const nilai = sheet_(tabel).getDataRange().getValues();
  const hasil = nilai.slice(1).map((b) => keObjek(tabel, b));
  if (def.cache) {
    const potongan = pecah(JSON.stringify(hasil), POTONGAN);
    try {
      cache.putAll(Object.fromEntries(potongan.map((p, i) => [`c_${tabel}_${i}`, p])), CACHE_DETIK);
      cache.put("n_" + tabel, String(potongan.length), CACHE_DETIK);
    } catch {
      cache.remove("n_" + tabel); // terlalu besar untuk cache: tetap jalan tanpa cache
    }
  }
  return hasil;
}

export function lupakanCache(tabel: NamaTabel) {
  CacheService.getScriptCache().remove("n_" + tabel);
}

/**
 * Tambah baris. Satu baris → appendRow (satu panggilan, aman dipakai bersamaan tanpa kunci).
 * Banyak baris → satu kali setValues (panggil di dalam denganKunci agar posisi baris tidak bertabrakan).
 */
export function tambah<T extends NamaTabel>(tabel: T, daftar: Partial<Baris<T>>[]) {
  if (!daftar.length) return;
  const sh = sheet_(tabel);
  const baris = daftar.map((o) => keBaris(tabel, o));
  if (baris.length === 1) sh.appendRow(baris[0]!);
  else {
    const mulai = sh.getLastRow() + 1;
    const kurang = mulai + baris.length - 1 - sh.getMaxRows();
    if (kurang > 0) sh.insertRowsAfter(sh.getMaxRows(), kurang);
    sh.getRange(mulai, 1, baris.length, baris[0]!.length).setValues(baris);
  }
  lupakanCache(tabel);
}

/** Ganti seluruh isi tabel (untuk data dummy dan sinkronisasi). Panggil di dalam denganKunci. */
export function gantiSemua<T extends NamaTabel>(tabel: T, daftar: Partial<Baris<T>>[]) {
  const sh = sheet_(tabel);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
  lupakanCache(tabel);
  tambah(tabel, daftar);
}

/** Jalankan fn di dalam kunci skrip. Kunci hanya untuk penghitung nomor dan pemeriksaan unik (Tahap 0). */
export function denganKunci<T>(fn: () => T): T {
  const kunci = LockService.getScriptLock();
  kunci.waitLock(30_000);
  try {
    return fn();
  } finally {
    kunci.releaseLock();
  }
}

export const sekarang = () => new Date().toISOString();
export const idBaru = () => Utilities.getUuid();
