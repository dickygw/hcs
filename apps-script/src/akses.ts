/**
 * Pembungkus pemeriksa (Standar Keamanan AKSES-01, AUTH-02).
 * Semua panggilan dari browser masuk lewat sini: identitas diambil di server, rute harus terdaftar,
 * dan peran harus diizinkan rute itu. Rute yang tidak terdaftar ditolak (tolak secara bawaan).
 */

export const DOMAIN = "pegadaian.co.id";

export type Peran = "karyawan" | "admin";

export interface Pemanggil {
  email: string;
  peran: Peran | null;
}

export interface Rute {
  /** "domain" = semua akun pegadaian.co.id, termasuk yang belum terdaftar (hanya untuk layar status/U2). */
  peran: readonly (Peran | "domain")[];
  jalankan: (arg: unknown, pemanggil: Pemanggil) => unknown;
}

/** Galat yang pesannya aman ditampilkan ke pengguna. Galat lain diganti pesan umum (WEB-05). */
export class GalatPengguna extends Error {}

export function buatApi(deps: {
  email: () => string;
  rute: Readonly<Record<string, Rute>>;
  peranDari: (email: string) => Peran | null;
}) {
  return (nama: unknown, arg: unknown): unknown => {
    const email = String(deps.email() ?? "").trim().toLowerCase();
    if (!email.endsWith("@" + DOMAIN)) throw new GalatPengguna("Akses ditolak.");

    const rute = typeof nama === "string" && Object.hasOwn(deps.rute, nama) ? deps.rute[nama] : undefined;
    if (!rute) throw new GalatPengguna("Permintaan tidak dikenal.");

    const peran = deps.peranDari(email);
    if (!rute.peran.includes("domain") && (!peran || !rute.peran.includes(peran))) {
      throw new GalatPengguna("Anda tidak memiliki akses ke halaman ini.");
    }
    return rute.jalankan(arg, { email, peran });
  };
}
