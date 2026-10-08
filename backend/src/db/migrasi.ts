/**
 * Menjalankan file migrasi di database/migrations/ secara berurutan (SUPA-16).
 * Memakai peran migrasi (DATABASE_URL_MIGRASI), bukan hcs_app.
 * Setelah itu mengatur password hcs_app dari DATABASE_URL agar tidak pernah tertulis di file migrasi.
 */
import { readdirSync, readFileSync } from "node:fs";
import pg from "pg";
import { opsiKoneksi } from "./koneksi.js";

const folder = new URL("../../../database/migrations/", import.meta.url);

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum diisi di .env");
const password = decodeURIComponent(new URL(process.env.DATABASE_URL).password);
if (password.length < 32) throw new Error("Password hcs_app di DATABASE_URL minimal 32 karakter (SUPA-10).");

const client = new pg.Client(opsiKoneksi("DATABASE_URL_MIGRASI"));
await client.connect();

try {
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS hcs;
    CREATE TABLE IF NOT EXISTS hcs.migrasi_terpasang (
      nama text PRIMARY KEY,
      dipasang_pada timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE hcs.migrasi_terpasang ENABLE ROW LEVEL SECURITY;
    ALTER TABLE hcs.migrasi_terpasang FORCE ROW LEVEL SECURITY;
  `);

  const sudah = new Set(
    (await client.query<{ nama: string }>("SELECT nama FROM hcs.migrasi_terpasang")).rows.map((r) => r.nama),
  );
  const file = readdirSync(folder).filter((f) => f.endsWith(".sql")).sort();

  for (const nama of file) {
    if (sudah.has(nama)) continue;
    console.log(`Memasang ${nama} ...`);
    await client.query("BEGIN");
    try {
      await client.query(readFileSync(new URL(nama, folder), "utf8"));
      await client.query("INSERT INTO hcs.migrasi_terpasang (nama) VALUES ($1)", [nama]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  }

  await client.query(`ALTER ROLE hcs_app WITH LOGIN PASSWORD ${client.escapeLiteral(password)}`);

  console.log(`Selesai. ${file.length - sudah.size} migrasi baru dipasang.`);
} finally {
  await client.end();
}
