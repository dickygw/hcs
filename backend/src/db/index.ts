import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { opsiKoneksi } from "./koneksi.js";
import * as skema from "./skema.js";

/** Koneksi harian aplikasi memakai peran terbatas hcs_app (SUPA-11). */
export function buatDb() {
  const pool = new pg.Pool({ ...opsiKoneksi("DATABASE_URL"), max: 10 });
  return { db: drizzle(pool, { schema: skema }), pool };
}
