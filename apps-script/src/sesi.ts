/**
 * Sesi HCS (AUTH-05, AUTH-06) dan pembatas jumlah panggilan (AUTH-07, RATE-01).
 * Login tetap ditangani Google; sesi HCS adalah "kunci layar" yang dicatat di server:
 * habis setelah 15 menit tanpa panggilan dan maksimal 12 jam sejak dimulai.
 */

/** Bagian CacheService yang dipakai (dapat diganti tiruan saat tes). */
export interface Cache {
  get(kunci: string): string | null;
  put(kunci: string, nilai: string, detik: number): void;
  remove(kunci: string): void;
}

export const DIAM_DETIK = 15 * 60;
export const MAKS_MS = 12 * 60 * 60 * 1000;
export const BATAS_PER_MENIT = 120;

export function buatSesi(cache: Cache, jam: () => number) {
  const kunci = (email: string) => "sesi:" + email;
  return {
    mulai(email: string) {
      cache.put(kunci(email), String(jam()), DIAM_DETIK);
    },
    /** Aktif bila belum 15 menit diam dan belum 12 jam; setiap pemeriksaan memperpanjang 15 menit. */
    aktif(email: string): boolean {
      const mulai = Number(cache.get(kunci(email)));
      if (!mulai) return false;
      if (jam() - mulai > MAKS_MS) {
        cache.remove(kunci(email));
        return false;
      }
      cache.put(kunci(email), String(mulai), DIAM_DETIK);
      return true;
    },
    akhiri(email: string) {
      cache.remove(kunci(email));
    },
  };
}

/**
 * ponytail: hitungan per menit di CacheService tidak atomik (dua panggilan bersamaan bisa terhitung satu);
 * cukup untuk menahan banjir panggilan, bukan penghitung presisi.
 */
export function buatPembatas(cache: Cache, jam: () => number, maks = BATAS_PER_MENIT) {
  return (email: string): boolean => {
    const kunci = `batas:${email}:${Math.floor(jam() / 60_000)}`;
    const n = Number(cache.get(kunci) || 0) + 1;
    cache.put(kunci, String(n), 120);
    return n <= maks;
  };
}

/** Sesi dan pembatas di Apps Script (CacheService skrip, jam server). */
export const sesiSkrip = () => buatSesi(CacheService.getScriptCache(), Date.now);
export const pembatasSkrip = () => buatPembatas(CacheService.getScriptCache(), Date.now);
