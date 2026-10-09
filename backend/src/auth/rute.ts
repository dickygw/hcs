import { randomBytes } from "node:crypto";
import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { batasiIp, pembatas } from "../batas.js";
import { domainSah, type Google } from "./google.js";
import {
  bacaCookie,
  buatSesi,
  cabutSesi,
  cariPengguna,
  COOKIE_SESI,
  muatSesi,
  opsiCookie,
  profil,
  samaAman,
  type Db,
  type Peran,
  type SesiAktif,
} from "./sesi.js";

const COOKIE_OAUTH = "hcs_oauth";
const opsiCookieOauth = { ...opsiCookie, path: "/api/auth" };

/**
 * AKSES-01: satu-satunya daftar aturan peran. Alamat /api yang tidak tercantum di sini
 * tertutup untuk semua orang (tolak secara bawaan), walaupun rutenya sudah dibuat.
 */
export const ATURAN_AKSES: [awalan: string, peran: Peran[]][] = [
  ["/api/auth/", ["karyawan", "admin"]],
  ["/api/admin/", ["admin"]],
];

const queryCallback = z.object({ code: z.string().min(1).max(2048), state: z.string().min(1).max(100) });

/** Rute terbuka: mulai masuk dan kembali dari Google. */
export function ruteMasuk(db: Db, google: Google) {
  const r = Router();
  const batasEmail = pembatas(10, 15 * 60 * 1000); // AUTH-07 per email
  r.use(batasiIp(20, 15 * 60 * 1000)); // AUTH-07 per IP

  r.get("/google", (_req, res) => {
    const state = randomBytes(32).toString("base64url");
    res.cookie(COOKIE_OAUTH, state, { ...opsiCookieOauth, maxAge: 10 * 60 * 1000 });
    res.redirect(303, google.urlMasuk(state));
  });

  r.get("/google/callback", async (req, res) => {
    const ke = (alamat: string) => res.redirect(303, alamat);
    const stateCookie = bacaCookie(req, COOKIE_OAUTH);
    res.clearCookie(COOKIE_OAUTH, opsiCookieOauth);

    if (req.query.error) return ke("/masuk"); // pengguna membatalkan di halaman Google
    const q = queryCallback.safeParse(req.query);
    // State harus sama dengan cookie: mencegah login paksa dari situs lain (WEB-03).
    if (!q.success || !stateCookie || !samaAman(q.data.state, stateCookie)) return ke("/masuk?galat=gagal");

    let klaim;
    try {
      klaim = await google.verifikasiKode(q.data.code);
    } catch {
      return ke("/masuk?galat=gagal");
    }
    const email = encodeURIComponent(klaim.email);
    if (!domainSah(klaim)) return ke(`/masuk?galat=domain&email=${email}`);
    if (!batasEmail(klaim.email)) return ke("/masuk?galat=terlalu-sering");

    const p = await cariPengguna(db, klaim.email);
    if (!p) return ke(`/belum-terdaftar?email=${email}`);

    const { token, maxAge } = await buatSesi(db, p.id);
    res.cookie(COOKIE_SESI, token, { ...opsiCookie, maxAge });
    ke("/");
  });

  return r;
}

/** AKSES-01, AUTH-05, WEB-03: pemeriksa tunggal di depan semua alamat /api selain rute terbuka. */
export function periksaAkses(db: Db): RequestHandler {
  return async (req, res, next) => {
    const token = bacaCookie(req, COOKIE_SESI);
    if (!token) {
      res.status(401).json({ kode: "belum_masuk", pesan: "Silakan masuk terlebih dahulu." });
      return;
    }
    const s = await muatSesi(db, token);
    if (!s) {
      res.clearCookie(COOKIE_SESI, opsiCookie);
      res.status(401).json({ kode: "sesi_berakhir", pesan: "Sesi Anda berakhir. Silakan masuk kembali." });
      return;
    }
    const aturan = ATURAN_AKSES.find(([awalan]) => req.originalUrl.startsWith(awalan));
    if (!aturan || !aturan[1].includes(s.peran)) {
      res.status(403).json({ pesan: "Anda tidak memiliki akses ke halaman ini." });
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD" && !samaAman(req.get("x-csrf-token"), s.csrf)) {
      res.status(403).json({ pesan: "Permintaan tidak dapat diproses. Muat ulang halaman lalu coba lagi." });
      return;
    }
    res.locals.sesi = s;
    next();
  };
}

/** Rute sesi untuk pengguna yang sudah masuk. */
export function ruteSesi(db: Db) {
  const r = Router();
  r.get("/sesi", async (_req, res) => {
    const s = res.locals.sesi as SesiAktif;
    res.json({ pengguna: await profil(db, s), csrf: s.csrf });
  });
  r.post("/keluar", async (_req, res) => {
    await cabutSesi(db, (res.locals.sesi as SesiAktif).sesiId);
    res.clearCookie(COOKIE_SESI, opsiCookie);
    res.status(204).end();
  });
  return r;
}
