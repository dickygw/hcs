/**
 * Tes keamanan Tahap 3: login, sesi, dan hak akses. Memakai database sungguhan (hcs-dev atau Postgres CI)
 * dengan data uji @pegadaian.co.id; Google diganti tiruan agar hasil verifikasi bisa diatur.
 */
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { Google, KlaimGoogle } from "../src/auth/google.js";
import type { Db } from "../src/auth/sesi.js";
import { buatDb } from "../src/db/index.js";
import { karyawan, pengguna } from "../src/db/skema.js";

const KARYAWAN = "uji.karyawan@pegadaian.co.id";
const ADMIN = "uji.admin@pegadaian.co.id";
const NONAKTIF = "uji.nonaktif@pegadaian.co.id";

const KLAIM: Record<string, KlaimGoogle> = {
  karyawan: { email: KARYAWAN, hd: "pegadaian.co.id", emailVerified: true },
  admin: { email: ADMIN, hd: "pegadaian.co.id", emailVerified: true },
  nonaktif: { email: NONAKTIF, hd: "pegadaian.co.id", emailVerified: true },
  asing: { email: "belum.ada@pegadaian.co.id", hd: "pegadaian.co.id", emailVerified: true },
  gmail: { email: "rina.p@gmail.com", emailVerified: true },
  tidakTerverifikasi: { email: KARYAWAN, hd: "pegadaian.co.id", emailVerified: false },
};

const googleTiruan: Google = {
  urlMasuk: (state) => `https://accounts.google.test/?state=${state}`,
  async verifikasiKode(kode) {
    const k = KLAIM[kode];
    if (!k) throw new Error("token palsu");
    return k;
  },
};

let ipKe = 0;
const ipBaru = () => `10.0.${Math.floor(++ipKe / 250)}.${ipKe % 250}`;

describe.skipIf(!process.env.DATABASE_URL)("Login, sesi, dan hak akses (Tahap 3)", () => {
  let db: Db;
  let tutup: () => Promise<void>;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    const d = buatDb();
    db = d.db;
    tutup = () => d.pool.end();
    app = createApp({ db, google: googleTiruan });

    for (const [nik, email, aktif] of [["UJI-K01", KARYAWAN, true], ["UJI-K02", NONAKTIF, false]] as const) {
      await db
        .insert(karyawan)
        .values({ nikPendek: nik, nama: `Data Uji ${nik}`, primEmail: email, aktif })
        .onConflictDoUpdate({ target: karyawan.nikPendek, set: { primEmail: email, aktif } });
    }
    await db
      .insert(pengguna)
      .values({ email: ADMIN, peran: "admin" })
      .onConflictDoUpdate({ target: pengguna.email, set: { peran: "admin", aktif: true } });
  });
  afterAll(() => tutup());

  async function masuk(kode: string, a = app, ip = ipBaru()) {
    const awal = await request(a).get("/api/auth/google").set("X-Forwarded-For", ip);
    const state = new URL(awal.headers.location!).searchParams.get("state")!;
    const cookieOauth = ([] as string[]).concat(awal.headers["set-cookie"] ?? [])[0]!.split(";")[0]!;
    const balik = await request(a)
      .get(`/api/auth/google/callback?code=${kode}&state=${state}`)
      .set("Cookie", cookieOauth)
      .set("X-Forwarded-For", ip);
    const mentah = ([] as string[]).concat(balik.headers["set-cookie"] ?? []).find((c) => c.startsWith("hcs_sesi="));
    return { lokasi: balik.headers.location, mentah, cookie: mentah?.split(";")[0] };
  }

  const tokenDari = (cookie: string) => decodeURIComponent(cookie.split("=")[1]!);
  const hash = (t: string) => createHash("sha256").update(t).digest("hex");

  it("karyawan terdaftar bisa masuk; cookie HttpOnly, Secure, SameSite=Lax (AUTH-04)", async () => {
    const m = await masuk("karyawan");
    expect(m.lokasi).toBe("/");
    expect(m.mentah).toMatch(/HttpOnly/);
    expect(m.mentah).toMatch(/Secure/);
    expect(m.mentah).toMatch(/SameSite=Lax/);

    const res = await request(app).get("/api/auth/sesi").set("Cookie", m.cookie!);
    expect(res.status).toBe(200);
    expect(res.body.pengguna).toMatchObject({ email: KARYAWAN, peran: "karyawan", nama: "Data Uji UJI-K01" });
  });

  it("token Google palsu ditolak", async () => {
    const m = await masuk("tanda-tangan-palsu");
    expect(m.lokasi).toBe("/masuk?galat=gagal");
    expect(m.cookie).toBeUndefined();
  });

  it("state yang tidak cocok ditolak (login paksa dari situs lain)", async () => {
    const res = await request(app).get("/api/auth/google/callback?code=karyawan&state=tebakan").set("Cookie", "hcs_oauth=lain");
    expect(res.headers.location).toBe("/masuk?galat=gagal");
    expect(String(res.headers["set-cookie"])).not.toMatch(/hcs_sesi=[^;]/);
  });

  it("akun luar domain dan email belum terverifikasi ditolak (AUTH-02)", async () => {
    expect((await masuk("gmail")).lokasi).toBe("/masuk?galat=domain&email=rina.p%40gmail.com");
    expect((await masuk("tidakTerverifikasi")).cookie).toBeUndefined();
  });

  it("email belum terdaftar atau karyawan nonaktif ditolak (AUTH-03)", async () => {
    expect((await masuk("asing")).lokasi).toBe("/belum-terdaftar?email=belum.ada%40pegadaian.co.id");
    const m = await masuk("nonaktif");
    expect(m.lokasi).toMatch(/^\/belum-terdaftar/);
    expect(m.cookie).toBeUndefined();
  });

  it("karyawan memanggil endpoint Admin ditolak; Admin lolos pemeriksa peran (AKSES-01)", async () => {
    const k = await masuk("karyawan");
    expect((await request(app).get("/api/admin/apa-saja").set("Cookie", k.cookie!)).status).toBe(403);
    const a = await masuk("admin");
    expect((await request(app).get("/api/admin/apa-saja").set("Cookie", a.cookie!)).status).toBe(404);
  });

  it("endpoint baru tanpa aturan tertutup, juga untuk Admin (tolak bawaan)", async () => {
    const a = await masuk("admin");
    expect((await request(app).get("/api/endpoint-baru").set("Cookie", a.cookie!)).status).toBe(403);
    expect((await request(app).get("/api/endpoint-baru")).status).toBe(401);
  });

  it("perubahan data tanpa token CSRF ditolak (WEB-03)", async () => {
    const m = await masuk("karyawan");
    const res = await request(app).post("/api/auth/keluar").set("Cookie", m.cookie!);
    expect(res.status).toBe(403);
    const salah = await request(app).post("/api/auth/keluar").set("Cookie", m.cookie!).set("X-CSRF-Token", "palsu");
    expect(salah.status).toBe(403);
  });

  it("keluar mencabut sesi di server; cookie lama tidak bisa dipakai lagi (AUTH-06)", async () => {
    const m = await masuk("karyawan");
    const { body } = await request(app).get("/api/auth/sesi").set("Cookie", m.cookie!);
    const res = await request(app).post("/api/auth/keluar").set("Cookie", m.cookie!).set("X-CSRF-Token", body.csrf);
    expect(res.status).toBe(204);
    const lagi = await request(app).get("/api/auth/sesi").set("Cookie", m.cookie!);
    expect(lagi.status).toBe(401);
    expect(lagi.body.kode).toBe("sesi_berakhir");
  });

  it("sesi berakhir setelah 15 menit diam (AUTH-05)", async () => {
    const m = await masuk("karyawan");
    await db.execute(
      sql`UPDATE hcs.sesi SET aktivitas_terakhir = now() - interval '16 minutes' WHERE token_hash = ${hash(tokenDari(m.cookie!))}`,
    );
    const res = await request(app).get("/api/auth/sesi").set("Cookie", m.cookie!);
    expect(res.status).toBe(401);
    expect(res.body.kode).toBe("sesi_berakhir");
  });

  it("sesi berakhir setelah 12 jam walaupun aktif (AUTH-05)", async () => {
    const m = await masuk("karyawan");
    await db.execute(
      sql`UPDATE hcs.sesi SET kedaluwarsa_pada = now() - interval '1 second' WHERE token_hash = ${hash(tokenDari(m.cookie!))}`,
    );
    expect((await request(app).get("/api/auth/sesi").set("Cookie", m.cookie!)).status).toBe(401);
  });

  it("cookie sesi karangan ditolak", async () => {
    const res = await request(app).get("/api/auth/sesi").set("Cookie", "hcs_sesi=karangan");
    expect(res.status).toBe(401);
  });

  it("percobaan login berulang dibatasi per IP (AUTH-07)", async () => {
    const a = createApp({ db, google: googleTiruan });
    const kode: number[] = [];
    for (let i = 0; i < 21; i++) kode.push((await request(a).get("/api/auth/google").set("X-Forwarded-For", "10.9.9.9")).status);
    expect(kode.slice(0, 20).every((s) => s === 303)).toBe(true);
    expect(kode[20]).toBe(429);
  });

  it("percobaan login berulang dibatasi per email (AUTH-07)", async () => {
    const a = createApp({ db, google: googleTiruan });
    for (let i = 0; i < 10; i++) expect((await masuk("karyawan", a)).lokasi).toBe("/");
    expect((await masuk("karyawan", a)).lokasi).toBe("/masuk?galat=terlalu-sering");
  });
});
