import type { RequestHandler } from "express";

/**
 * Pembatas jumlah permintaan (RATE-01, AUTH-07). Mengembalikan false bila kunci melewati batas.
 * ponytail: hitungan di memori satu proses; ganti ke penyimpanan bersama bila server lebih dari satu instance.
 */
export function pembatas(maks: number, jendelaMs: number) {
  const catatan = new Map<string, { n: number; sampai: number }>();
  return (kunci: string) => {
    const kini = Date.now();
    let c = catatan.get(kunci);
    if (!c || c.sampai < kini) {
      if (catatan.size > 10_000) catatan.clear();
      c = { n: 0, sampai: kini + jendelaMs };
      catatan.set(kunci, c);
    }
    return ++c.n <= maks;
  };
}

export function batasiIp(maks: number, jendelaMs: number): RequestHandler {
  const cek = pembatas(maks, jendelaMs);
  return (req, res, next) => {
    if (cek(req.ip ?? "")) return next();
    res.status(429).json({ pesan: "Terlalu banyak permintaan. Tunggu beberapa menit lalu coba lagi." });
  };
}
