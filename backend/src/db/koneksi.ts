import { readFileSync } from "node:fs";
import pg from "pg";

/**
 * Pengaturan koneksi Postgres dengan SSL terverifikasi (SUPA-05).
 * SSL hanya boleh dimatikan untuk database lokal di GitHub Actions (DATABASE_SSL=nonaktif).
 */
export function opsiKoneksi(namaVariabel: "DATABASE_URL" | "DATABASE_URL_MIGRASI"): pg.PoolConfig {
  const url = process.env[namaVariabel];
  if (!url) throw new Error(`${namaVariabel} belum diisi di .env`);
  if (/sslmode=/i.test(url)) {
    throw new Error(`Hapus "sslmode" dari ${namaVariabel}; SSL diatur lewat DATABASE_CA_FILE.`);
  }

  if (process.env.DATABASE_SSL === "nonaktif") {
    if (process.env.NODE_ENV === "production") throw new Error("SSL database wajib aktif di produksi.");
    return { connectionString: url, ssl: false };
  }

  const caFile = process.env.DATABASE_CA_FILE;
  if (!caFile) throw new Error("DATABASE_CA_FILE belum diisi di .env");
  return { connectionString: url, ssl: { ca: readFileSync(caFile, "utf8"), rejectUnauthorized: true } };
}
