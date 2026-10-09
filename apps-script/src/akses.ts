/**
 * Pembungkus pemeriksa (Standar Keamanan AKSES-01, AUTH-02, AUTH-05, AUTH-07).
 * Semua panggilan dari browser masuk lewat sini: identitas diambil di server, rute harus terdaftar,
 * jumlah panggilan dibatasi, sesi HCS harus aktif, dan peran harus diizinkan rute itu.
 * Rute yang tidak terdaftar ditolak (tolak secara bawaan).
 */

export const DOMAIN = "pegadaian.co.id";

export type Peran = "karyawan" | "admin";

export interface Pemanggil {
  email: string;
  peran: Peran | null;
}

export interface Rute {
  /** "domain" = semua akun pegadaian.co.id, termasuk yang belum terdaftar (hanya untuk mulai/keluar). */
  peran: readonly (Peran | "domain")[];
  /** true hanya untuk rute yang memulai atau mengakhiri sesi. */
  tanpaSesi?: boolean;
  jalankan: (arg: unknown, pemanggil: Pemanggil) => unknown;
}

/** Galat yang pesannya aman ditampilkan ke pengguna. kode dipakai tampilan (mis. sesi_berakhir). */
export class GalatPengguna extends Error {
  constructor(
    pesan: string,
    readonly kode = "",
  ) {
    super(pesan);
  }
}

export function buatApi(deps: {
  email: () => string;
  rute: Readonly<Record<string, Rute>>;
  peranDari: (email: string) => Peran | null;
  sesiAktif: (email: string) => boolean;
  dalamBatas: (email: string) => boolean;
}) {
  return (nama: unknown, arg: unknown): unknown => {
    const email = String(deps.email() ?? "").trim().toLowerCase();
    if (!email.endsWith("@" + DOMAIN)) throw new GalatPengguna("Akses ditolak.");

    const rute = typeof nama === "string" && Object.hasOwn(deps.rute, nama) ? deps.rute[nama] : undefined;
    if (!rute) throw new GalatPengguna("Permintaan tidak dikenal.");

    if (!deps.dalamBatas(email)) {
      throw new GalatPengguna("Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.", "terlalu_sering");
    }
    if (!rute.tanpaSesi && !deps.sesiAktif(email)) {
      throw new GalatPengguna("Sesi Anda berakhir. Silakan masuk kembali.", "sesi_berakhir");
    }

    const peran = deps.peranDari(email);
    if (!rute.peran.includes("domain") && (!peran || !rute.peran.includes(peran))) {
      throw new GalatPengguna("Anda tidak memiliki akses ke halaman ini.");
    }
    return rute.jalankan(arg, { email, peran });
  };
}
