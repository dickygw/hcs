import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import type { Google } from "./auth/google.js";
import { periksaAkses, ruteMasuk, ruteSesi } from "./auth/rute.js";
import type { Db } from "./auth/sesi.js";
import { batasiIp } from "./batas.js";

/**
 * Membuat aplikasi Express HCS.
 * Dipisah dari server.ts agar bisa dites tanpa menyalakan server sungguhan.
 */
export function createApp({ db, google }: { db: Db; google: Google }) {
  const app = express();

  app.disable("x-powered-by");
  // Backend hanya menerima koneksi dari Next.js di mesin yang sama; IP asli dibaca dari X-Forwarded-For.
  app.set("trust proxy", "loopback");
  app.use(helmet()); // header keamanan dasar (WEB-02)
  app.use(express.json({ limit: "100kb" })); // batas ukuran isi permintaan (RATE-02)
  app.use("/api", batasiIp(300, 60 * 1000)); // RATE-01

  // Pemeriksaan kesehatan server. Satu-satunya alamat yang terbuka tanpa login.
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.use("/api/auth", ruteMasuk(db, google));

  // Semua alamat /api di bawah baris ini wajib login dan lolos aturan peran.
  app.use("/api", periksaAkses(db));
  app.use("/api/auth", ruteSesi(db));

  // Alamat yang tidak dikenal.
  app.use((_req, res) => {
    res.status(404).json({ pesan: "Halaman tidak ditemukan." });
  });

  // Penanganan error: pesan umum ke pengguna, detail hanya di log server (WEB-05).
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status =
      typeof err === "object" && err !== null && "status" in err && typeof err.status === "number"
        ? err.status
        : 500;

    if (status >= 500) {
      console.error(err);
      res.status(500).json({ pesan: "Terjadi kesalahan pada server. Silakan coba lagi." });
      return;
    }
    res.status(status).json({ pesan: "Permintaan tidak dapat diproses." });
  });

  return app;
}
