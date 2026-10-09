/**
 * Data DUMMY untuk HCS-dev: 30 karyawan, 15 TAD, tarif SPPD PRD 5.5, jenis layanan.
 * Semua nama, NIK, email, dan rekening rekaan. Tidak pernah dijalankan di produksi (pemilik.ts).
 */
import type { Baris } from "./skema";

const NAMA = [
  "Andi Pratama", "Bunga Lestari", "Cahyo Nugroho", "Dewi Anggraini", "Eko Saputra",
  "Fitri Handayani", "Gilang Ramadhan", "Hesti Wulandari", "Irfan Hakim", "Joko Susilo",
  "Kartika Sari", "Lukman Hidayat", "Maya Puspita", "Nanda Kurniawan", "Oki Firmansyah",
  "Putri Maharani", "Qori Aulia", "Rizky Fadillah", "Sinta Permata", "Taufik Rahman",
  "Umi Kalsum", "Vino Aditya", "Wulan Septiani", "Yoga Prasetyo", "Zahra Amelia",
  "Agus Setiawan", "Bella Safitri", "Candra Wijaya", "Dian Novita", "Erlangga Putra",
];
const UNIT = [
  ["KW04", "Kantor Wilayah IV Balikpapan", "Kanwil IV Balikpapan", "Bagian SDM"],
  ["KW04", "Kantor Wilayah IV Balikpapan", "Kanwil IV Balikpapan", "Bagian Keuangan"],
  ["CP1101", "CP Balikpapan", "Area Balikpapan", "Operasional"],
  ["CP1102", "CP Samarinda", "Area Samarinda", "Operasional"],
  ["CP1103", "CP Tarakan", "Area Tarakan", "Operasional"],
  ["CP1104", "CP Banjarmasin", "Area Banjarmasin", "Operasional"],
] as const;
// Sebaran JG: Gol. A (>=14), B (11-13), C (4-10), dan satu JG 0 (Masa Persiapan Pensiun, butuh koreksi JG).
const JG = [15, 14, 13, 12, 11, 11, 10, 9, 8, 8, 7, 7, 6, 6, 5, 5, 4, 4, 12, 9, 7, 6, 5, 10, 13, 8, 6, 4, 0, 16];
const JABATAN: Record<string, string> = { A: "Kepala Bagian", B: "Manajer", C: "Staf" };

export const golongan = (jg: number) => (jg >= 14 ? "A" : jg >= 11 ? "B" : "C");

/** Tarif SE 145 Tahun 2026 (PRD 5.5). Tanggal berlaku sementara 01-01-2026 (pertanyaan terbuka). */
const TARIF: [string, string, number][] = [
  ["A", "harian_menginap", 520000], ["B", "harian_menginap", 410000], ["C", "harian_menginap", 300000], ["TAD", "harian_menginap", 210000],
  ["A", "transport_terminal", 250000], ["B", "transport_terminal", 250000], ["C", "transport_terminal", 250000], ["TAD", "transport_terminal", 175000],
  ["A", "harian_tidak_menginap_30_60", 350000], ["B", "harian_tidak_menginap_30_60", 250000], ["C", "harian_tidak_menginap_30_60", 180000], ["TAD", "harian_tidak_menginap_30_60", 126000],
  ["A", "harian_tidak_menginap_60", 380000], ["B", "harian_tidak_menginap_60", 270000], ["C", "harian_tidak_menginap_60", 200000], ["TAD", "harian_tidak_menginap_60", 140000],
  ["A", "sewa_rumah_bulanan", 3300000], ["B", "sewa_rumah_bulanan", 2200000], ["C", "sewa_rumah_bulanan", 1300000],
];

export function buatDataDummy(opsi: { kini: string; acak: () => number; idBaru: () => string; enkripsi: (teks: string) => string }) {
  const { kini, acak, idBaru, enkripsi } = opsi;

  const karyawan: Partial<Baris<"karyawan">>[] = NAMA.map((nama, i) => {
    const jg = JG[i]!;
    const [kodeUnit, namaUnit, branch, dep] = UNIT[i % UNIT.length]!;
    return {
      nik_pendek: "P9" + String(i + 1).padStart(4, "0"),
      nama,
      prim_email: `karyawan${String(i + 1).padStart(2, "0")}@contoh.test`,
      emp_type_name: "Pegawai Tetap",
      kode_job_grade: String(jg),
      job_grade_def: String(jg),
      position_type_name: "Struktural",
      position_name: JABATAN[golongan(jg)]!,
      kode_unit_kerja: kodeUnit, nama_unit_kerja: namaUnit, branch_name: branch, dep_name: dep,
      jg_perdin_override: "", aktif: "ya", diperbarui_pada: kini,
    };
  });

  const VENDOR = ["POJ", "PKSS", "EPS", "INHOUSE"];
  const tad: Partial<Baris<"tad">>[] = Array.from({ length: 15 }, (_, i) => {
    // Rekening BRI 15 digit rekaan; 2 TAD terakhir sengaja belum punya rekening.
    const rekening = i < 13 ? "0" + Array.from({ length: 14 }, () => Math.floor(acak() * 10)).join("") : "";
    return {
      id: idBaru(),
      nik: "64" + String(7100000000000 + i * 7919),
      nama: `TAD Dummy ${String(i + 1).padStart(2, "0")}`,
      nama_bank: rekening ? "BRI" : "",
      rekening_terenkripsi: rekening ? enkripsi(rekening) : "",
      vendor: VENDOR[i % VENDOR.length]!,
      unit_kerja: UNIT[i % UNIT.length]![1],
      tgl_akhir_kontrak: "",
      sumber_data: "unggahan",
      terverifikasi: "ya",
      aktif: "ya",
      dibuat_pada: kini,
      diperbarui_pada: kini,
    };
  });

  const tarif_sppd: Partial<Baris<"tarif_sppd">>[] = TARIF.map(([gol, komponen, nominal]) => ({
    golongan: gol, komponen, nominal: String(nominal), berlaku_mulai: "2026-01-01", berlaku_sampai: "", dibuat_pada: kini,
  }));

  const jenis_layanan: Partial<Baris<"jenis_layanan">>[] = [
    { kode: "klaim_perdin", nama: "Klaim Biaya Perdin", awalan_nomor: "KP", aktif: "ya" },
    { kode: "klaim_perdin_diklat", nama: "Klaim Biaya Perdin Diklat", awalan_nomor: "KD", aktif: "ya" },
    { kode: "permohonan_sppd", nama: "Permohonan SPPD", awalan_nomor: "SP", aktif: "ya" },
    { kode: "pemesanan_tiket", nama: "Pemesanan Tiket Pesawat", awalan_nomor: "TP", aktif: "ya" },
  ];

  return { karyawan, tad, tarif_sppd, jenis_layanan };
}
