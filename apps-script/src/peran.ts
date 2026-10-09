/**
 * Penentu peran dan profil (AUTH-03). Admin: terdaftar dan aktif di tabel pengguna.
 * Karyawan: terdaftar sebagai karyawan di tabel pengguna, atau email kantornya aktif di data master karyawan.
 * Baris pengguna yang dinonaktifkan selalu menolak, walaupun ada di data master.
 */
import type { Peran } from "./akses";
import type { Baris } from "./skema";

export interface Profil {
  email: string;
  peran: Peran;
  nama: string;
  nik: string;
  jabatan: string;
  unitKerja: string;
}

const aktif = (nilai: string) => nilai === "ya";

export function peranDari(email: string, pengguna: Baris<"pengguna">[], karyawan: Baris<"karyawan">[]): Peran | null {
  const p = pengguna.find((x) => x.email.toLowerCase() === email);
  if (p) {
    if (!aktif(p.aktif)) return null;
    if (p.peran === "admin") return "admin";
  }
  const k = karyawan.find((x) => x.prim_email.toLowerCase() === email);
  if (k && aktif(k.aktif)) return "karyawan";
  return null;
}

/** Hanya kolom yang dibutuhkan layar (Prinsip 3). */
export function profilDari(email: string, peran: Peran, karyawan: Baris<"karyawan">[]): Profil {
  const k = karyawan.find((x) => x.prim_email.toLowerCase() === email);
  return {
    email,
    peran,
    nama: k?.nama || email.split("@")[0]!,
    nik: k?.nik_pendek ?? "",
    jabatan: k?.position_name ?? "",
    unitKerja: k?.nama_unit_kerja ?? "",
  };
}
