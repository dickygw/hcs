import type { Rute } from "./akses";

/**
 * Daftar SEMUA fungsi server yang boleh dipanggil browser, beserta peran yang diizinkan (AKSES-01).
 * Fungsi yang tidak ada di daftar ini tidak dapat dipanggil dari browser.
 */
export const RUTE: Readonly<Record<string, Rute>> = {
  status: {
    peran: ["domain"],
    jalankan: (_arg, p) => ({ aplikasi: "HCS", email: p.email, terdaftar: p.peran !== null }),
  },
};
