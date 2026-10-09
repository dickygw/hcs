export type Peran = "karyawan" | "admin";

/** Sama dengan Profil di apps-script/src/peran.ts. */
export interface Pengguna {
  email: string;
  peran: Peran;
  nama: string;
  nik: string;
  jabatan: string;
  unitKerja: string;
}

export type HasilMulai =
  | { terdaftar: true; pengguna: Pengguna }
  | { terdaftar: false; email: string; kontak: string; urlAplikasi: string };

export const inisial = (nama: string) =>
  nama
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((k) => k[0]!.toUpperCase())
    .join("");
