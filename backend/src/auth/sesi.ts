import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import type { CookieOptions, Request } from "express";
import type { buatDb } from "../db/index.js";
import { karyawan, pengguna, sesi } from "../db/skema.js";

export type Db = ReturnType<typeof buatDb>["db"];
export type Peran = "karyawan" | "admin";
export interface SesiAktif {
  sesiId: number;
  penggunaId: number;
  email: string;
  peran: Peran;
  csrf: string;
}

export const COOKIE_SESI = "hcs_sesi";
export const DIAM_MAKS_MENIT = 15; // AUTH-05
const UMUR_MAKS_MS = 12 * 60 * 60 * 1000; // AUTH-05

// AUTH-04: token hanya di cookie HttpOnly, tidak bisa dibaca JavaScript di browser.
export const opsiCookie: CookieOptions = { httpOnly: true, secure: true, sameSite: "lax", path: "/" };

const acak = () => randomBytes(32).toString("base64url");
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export function samaAman(a: string | undefined, b: string) {
  if (!a) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function bacaCookie(req: Request, nama: string) {
  for (const bagian of (req.headers.cookie ?? "").split(";")) {
    const i = bagian.indexOf("=");
    if (bagian.slice(0, i).trim() === nama) return decodeURIComponent(bagian.slice(i + 1).trim());
  }
  return undefined;
}

/**
 * AUTH-03: email harus terdaftar dan aktif. Admin cukup terdaftar di tabel pengguna;
 * karyawan harus aktif di data master karyawan (baris pengguna dibuat saat pertama masuk).
 */
export async function cariPengguna(db: Db, email: string) {
  const [p] = await db.select().from(pengguna).where(eq(pengguna.email, email));
  if (p && !p.aktif) return null;
  if (p?.peran === "admin") return p;

  const [k] = await db
    .select({ id: karyawan.id })
    .from(karyawan)
    .where(and(eq(sql`lower(${karyawan.primEmail})`, email), eq(karyawan.aktif, true)))
    .limit(1);
  if (!k) return null;
  if (p) return p;

  await db.insert(pengguna).values({ email, peran: "karyawan" }).onConflictDoNothing();
  const [baru] = await db.select().from(pengguna).where(eq(pengguna.email, email));
  return baru?.aktif ? baru : null;
}

export async function buatSesi(db: Db, penggunaId: number) {
  const token = acak();
  await db.insert(sesi).values({
    tokenHash: hash(token),
    penggunaId,
    csrfToken: acak(),
    kedaluwarsaPada: new Date(Date.now() + UMUR_MAKS_MS),
  });
  return { token, maxAge: UMUR_MAKS_MS };
}

/**
 * Mengambil sesi yang masih berlaku dan mencatat aktivitas terbaru dalam satu query.
 * Waktu dibandingkan dengan jam database agar tidak bergantung pada jam server aplikasi.
 */
export async function muatSesi(db: Db, token: string): Promise<SesiAktif | null> {
  const { rows } = await db.execute<{ sesi_id: string; pengguna_id: string; email: string; peran: Peran; csrf: string }>(sql`
    UPDATE hcs.sesi s SET aktivitas_terakhir = now()
    FROM hcs.pengguna p
    WHERE s.token_hash = ${hash(token)}
      AND s.dicabut_pada IS NULL
      AND s.kedaluwarsa_pada > now()
      AND s.aktivitas_terakhir > now() - make_interval(mins => ${DIAM_MAKS_MENIT})
      AND p.id = s.pengguna_id AND p.aktif
    RETURNING s.id AS sesi_id, p.id AS pengguna_id, p.email, p.peran, s.csrf_token AS csrf`);
  const r = rows[0];
  return r ? { sesiId: Number(r.sesi_id), penggunaId: Number(r.pengguna_id), email: r.email, peran: r.peran, csrf: r.csrf } : null;
}

/** AUTH-06: keluar mencabut sesi di database, bukan hanya menghapus cookie. */
export async function cabutSesi(db: Db, sesiId: number) {
  await db.update(sesi).set({ dicabutPada: new Date() }).where(eq(sesi.id, sesiId));
}

/** Data profil untuk tampilan (K6, sapaan). Hanya kolom yang dibutuhkan layar. */
export async function profil(db: Db, s: SesiAktif) {
  const [k] = await db
    .select({
      nama: karyawan.nama,
      nik: karyawan.nikPendek,
      jabatan: karyawan.positionName,
      unitKerja: karyawan.namaUnitKerja,
    })
    .from(karyawan)
    .where(eq(sql`lower(${karyawan.primEmail})`, s.email))
    .limit(1);
  return { email: s.email, peran: s.peran, nama: k?.nama ?? s.email.split("@")[0]!, nik: k?.nik ?? null, jabatan: k?.jabatan ?? null, unitKerja: k?.unitKerja ?? null };
}
