/**
 * Mesin hitung SPPD (PRD 5.5, SE 145 Tahun 2026). Fungsi murni; dipakai server (hitung ulang, INPUT-03)
 * dan layar Admin (pratinjau langsung). Karyawan tidak pernah menerima tarif atau rumus (PRD 5.8).
 *
 * Aturan (keputusan user 13-10-2026, pola Daftar Pembayaran SPPD Lumpsum):
 * - Menginap: uang harian = tarif × 1 hari (unit kerja asal) + tarif × (jumlah hari − 1) (kota tujuan).
 *   Kendaraan dinas tetap 100%.
 * - Tidak menginap (> 30 km): tarif jarak × jumlah hari di kolom unit kerja asal; kendaraan dinas 50% dan
 *   transportasi bandara tidak dibayarkan.
 * - Transportasi bandara/stasiun/terminal/pelabuhan = tarif × jumlah kali jalan (usulan 4 menginap, 2 tidak menginap;
 *   0 bila kendaraan dinas atau darat).
 * - Bantuan sewa rumah: penugasan menginap > 12 hari, per bulan (usulan dibulatkan ke atas per 30 hari), bukan TAD.
 * - TAD memakai baris tarif golongan TAD (70% Gol. C).
 * - Hotel dan tiket at cost diisi Admin. Jumlah hari, kali jalan, dan bulan sewa dapat diubah Admin dengan alasan.
 */
import { GalatPengguna } from "./akses";
import type { Baris } from "./skema";

export type Gol = "A" | "B" | "C" | "TAD";
export const GOLONGAN: readonly Gol[] = ["A", "B", "C", "TAD"];

export interface Perjalanan {
  tgl_berangkat: string;
  tgl_kembali: string;
  menginap: string;
  jarak: string;
  moda_transportasi: string;
  kendaraan_dinas: string;
}

/** Isian Admin per orang. Kosong = pakai usulan sistem. */
export interface Masukan {
  qtyAsal?: number;
  qtyTujuan?: number;
  jalan?: number;
  sewaBulan?: number;
  hotel?: number;
  tiket?: number;
  penyesuaian?: number;
  alasan?: string;
}

export interface Hasil {
  gol: Gol;
  hari: number;
  tarifAsal: number;
  qtyAsal: number;
  tarifTujuan: number;
  qtyTujuan: number;
  uangHarian: number;
  tarifJalan: number;
  jalan: number;
  transport: number;
  sewaBulan: number;
  sewa: number;
  hotel: number;
  tiket: number;
  penyesuaian: number;
  alasan: string;
  total: number;
  /** true bila jumlah hari/jalan/bulan berbeda dari usulan atau ada penyesuaian: alasan wajib. */
  diubah: boolean;
}

export type FungsiTarif = (gol: Gol, komponen: string) => number;

/** Tarif yang berlaku pada tanggal berangkat (tabel tarif_sppd, PRD 5.5). */
export function tarifBerlaku(tarif: Baris<"tarif_sppd">[], tanggal: string): FungsiTarif {
  return (gol, komponen) => {
    const cocok = tarif
      .filter((t) => t.golongan === gol && t.komponen === komponen && t.berlaku_mulai <= tanggal && (!t.berlaku_sampai || t.berlaku_sampai >= tanggal))
      .sort((a, b) => b.berlaku_mulai.localeCompare(a.berlaku_mulai))[0];
    if (!cocok) throw new GalatPengguna(`Tarif ${komponen.replace(/_/g, " ")} golongan ${gol} untuk tanggal ${tanggal} belum ada di Tarif SPPD.`);
    return Number(cocok.nominal) || 0;
  };
}

export function jumlahHari(p: Perjalanan): number {
  if (!p.tgl_berangkat) return 0;
  const a = Date.parse(p.tgl_berangkat + "T00:00:00Z");
  const b = Date.parse((p.tgl_kembali || p.tgl_berangkat) + "T00:00:00Z");
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

export function usulan(p: Perjalanan, gol: Gol) {
  const hari = jumlahHari(p);
  const menginap = p.menginap === "ya";
  const tanpaJalan = p.kendaraan_dinas === "ya" || p.moda_transportasi === "darat";
  return {
    qtyAsal: menginap ? Math.min(1, hari) : hari,
    qtyTujuan: menginap ? Math.max(0, hari - 1) : 0,
    jalan: tanpaJalan ? 0 : menginap ? 4 : 2,
    sewaBulan: menginap && gol !== "TAD" && hari > 12 ? Math.ceil(hari / 30) : 0,
  };
}

const bulat = (v: unknown, min: number, maks: number, bawaan: number) => {
  if (v === undefined || v === null || v === "") return bawaan;
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < min || n > maks) throw new GalatPengguna("Isian perhitungan di luar batas yang wajar.");
  return n;
};

export function hitungOrang(p: Perjalanan, gol: Gol, tarif: FungsiTarif, m: Masukan = {}): Hasil {
  const u = usulan(p, gol);
  const hari = jumlahHari(p);
  const menginap = p.menginap === "ya";
  const qtyAsal = bulat(m.qtyAsal, 0, 366, u.qtyAsal);
  const qtyTujuan = bulat(m.qtyTujuan, 0, 366, u.qtyTujuan);
  // Tidak menginap dengan kendaraan dinas: transportasi bandara tidak dibayarkan.
  const jalanDilarang = !menginap && p.kendaraan_dinas === "ya";
  const jalan = jalanDilarang ? 0 : bulat(m.jalan, 0, 20, u.jalan);
  const sewaBulan = gol === "TAD" ? 0 : bulat(m.sewaBulan, 0, 12, u.sewaBulan);

  let tarifHarian: number;
  if (menginap) tarifHarian = tarif(gol, "harian_menginap");
  else {
    tarifHarian = tarif(gol, p.jarak === "60" ? "harian_tidak_menginap_60" : "harian_tidak_menginap_30_60");
    if (p.kendaraan_dinas === "ya") tarifHarian = Math.round(tarifHarian / 2);
  }
  const tarifJalan = jalan ? tarif(gol, "transport_terminal") : 0;
  const sewa = sewaBulan ? sewaBulan * tarif(gol, "sewa_rumah_bulanan") : 0;
  const hotel = bulat(m.hotel, 0, 1_000_000_000, 0);
  const tiket = bulat(m.tiket, 0, 1_000_000_000, 0);
  const penyesuaian = bulat(m.penyesuaian, -1_000_000_000, 1_000_000_000, 0);
  const alasan = String(m.alasan ?? "").trim().slice(0, 300);
  const diubah = qtyAsal !== u.qtyAsal || qtyTujuan !== u.qtyTujuan || jalan !== u.jalan || sewaBulan !== u.sewaBulan || penyesuaian !== 0;

  const uangHarian = tarifHarian * (qtyAsal + qtyTujuan);
  const transport = tarifJalan * jalan;
  const total = uangHarian + transport + sewa + hotel + tiket + penyesuaian;
  if (total < 0) throw new GalatPengguna("Total tidak boleh kurang dari nol.");
  return {
    gol, hari, tarifAsal: tarifHarian, qtyAsal, tarifTujuan: qtyTujuan ? tarifHarian : 0, qtyTujuan, uangHarian,
    tarifJalan, jalan, transport, sewaBulan, sewa, hotel, tiket, penyesuaian, alasan, total, diubah,
  };
}

/** Alasan wajib bila Admin mengubah usulan sistem atau memberi penyesuaian (PRD 5.5). */
export function periksaAlasan(nama: string, h: Hasil) {
  if (h.diubah && h.alasan.length < 5) throw new GalatPengguna(`Tulis alasan perubahan perhitungan untuk ${nama}.`);
}

/** Rincian untuk karyawan setelah Selesai: nama komponen dan nominal saja, tanpa tarif atau rumus (PRD 5.8). */
export function rincianTampil(h: Hasil): { label: string; nominal: number }[] {
  const r = [
    { label: `Uang harian (${h.qtyAsal + h.qtyTujuan} hari)`, nominal: h.uangHarian },
    { label: "Transportasi bandara/terminal", nominal: h.transport },
    { label: "Bantuan sewa rumah", nominal: h.sewa },
    { label: "Hotel", nominal: h.hotel },
    { label: "Tiket", nominal: h.tiket },
    { label: "Penyesuaian", nominal: h.penyesuaian },
  ];
  return r.filter((x) => x.nominal !== 0);
}
