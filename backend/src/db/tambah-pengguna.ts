/**
 * npm run db:tambah-pengguna -- <email> <karyawan|admin>
 * Mendaftarkan atau mengaktifkan pengguna. Dipakai untuk Admin pertama; Admin berikutnya lewat A9 Pengaturan.
 */
import { z } from "zod";
import { DOMAIN } from "../auth/google.js";
import { buatDb } from "./index.js";
import { pengguna } from "./skema.js";

const [email, peran] = z
  .tuple([z.string().toLowerCase().pipe(z.email()).refine((e) => e.endsWith(`@${DOMAIN}`), `Email harus @${DOMAIN}`), z.enum(["karyawan", "admin"])])
  .parse(process.argv.slice(2));

const { db, pool } = buatDb();
await db
  .insert(pengguna)
  .values({ email, peran })
  .onConflictDoUpdate({ target: pengguna.email, set: { peran, aktif: true, diperbaruiPada: new Date() } });
await pool.end();
console.log(`${email} terdaftar sebagai ${peran}.`);
