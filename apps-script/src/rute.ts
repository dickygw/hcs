import type { Rute } from "./akses";
import { baca } from "./data";
import { profilDari } from "./peran";
import { sesiSkrip } from "./sesi";

/** Kontak di layar U2. Kotak masuk bersama; hanya kontak, bukan akun login Admin (keputusan 09-10-2026). */
export const KONTAK_ADMIN_SDM = "manohc.balikpapan@pegadaian.co.id";

const urlAplikasi = () => ScriptApp.getService().getUrl();

/**
 * Daftar SEMUA fungsi server yang boleh dipanggil browser, beserta peran yang diizinkan (AKSES-01).
 * Fungsi yang tidak ada di daftar ini tidak dapat dipanggil dari browser.
 */
export const RUTE: Readonly<Record<string, Rute>> = {
  /** Dipanggil saat HCS dibuka dan saat "Masuk kembali". Email belum terdaftar → data layar U2. */
  mulai: {
    peran: ["domain"],
    tanpaSesi: true,
    jalankan: (_arg, p) => {
      if (!p.peran) return { terdaftar: false, email: p.email, kontak: KONTAK_ADMIN_SDM, urlAplikasi: urlAplikasi() };
      sesiSkrip().mulai(p.email);
      return { terdaftar: true, pengguna: profilDari(p.email, p.peran, baca("karyawan")) };
    },
  },
  /** AUTH-06: menghapus sesi HCS di server. */
  keluar: {
    peran: ["domain"],
    tanpaSesi: true,
    jalankan: (_arg, p) => {
      sesiSkrip().akhiri(p.email);
      return { urlAplikasi: urlAplikasi() };
    },
  },
};
