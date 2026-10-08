/**
 * npm run db:seed — data DUMMY untuk hcs-dev: 30 karyawan dan 15 TAD.
 * Semua nama, NIK, email, dan rekening rekaan. Jangan pernah dijalankan di produksi.
 * Aman dijalankan berulang: baris yang sudah ada dilewati.
 */
import { enkripsi } from "../enkripsi.js";
import { buatDb } from "./index.js";
import { karyawan, tad } from "./skema.js";

if (process.env.NODE_ENV === "production") throw new Error("Seed dummy dilarang di produksi.");

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
// Sebaran JG: Gol. A (>=14), B (11-13), C (4-10), dan satu JG 0 (Masa Persiapan Pensiun).
const JG = [15, 14, 13, 12, 11, 11, 10, 9, 8, 8, 7, 7, 6, 6, 5, 5, 4, 4, 12, 9, 7, 6, 5, 10, 13, 8, 6, 4, 0, 16];
const JABATAN: Record<string, string> = { A: "Kepala Bagian", B: "Manajer", C: "Staf" };

function golongan(jg: number) {
  return jg >= 14 ? "A" : jg >= 11 ? "B" : "C";
}

const dataKaryawan = NAMA.map((nama, i) => {
  const jg = JG[i]!;
  const [kodeUnit, namaUnit, branch, dep] = UNIT[i % UNIT.length]!;
  return {
    nikPendek: `P9${String(i + 1).padStart(4, "0")}`,
    nama,
    primEmail: `karyawan${String(i + 1).padStart(2, "0")}@contoh.test`,
    empTypeName: jg === 0 ? "Masa Persiapan Pensiun" : "Pegawai Tetap",
    kodeJobGrade: String(jg),
    jobGradeDef: String(jg === 0 ? 10 : Math.max(4, jg - (i % 2))),
    positionTypeName: jg >= 11 ? "Struktural" : "Fungsional",
    positionName: `${JABATAN[golongan(jg)]} ${dep}`,
    kodeUnitKerja: kodeUnit,
    namaUnitKerja: namaUnit,
    branchName: branch,
    depName: dep,
  };
});

const NAMA_TAD = [
  "Arif Budiman", "Rina Marlina", "Hendra Gunawan", "Siti Nurhaliza", "Bayu Saputra",
  "Lina Marlina", "Dodi Irawan", "Yuni Astuti", "Rudi Hartono", "Ani Suryani",
  "Fajar Nugraha", "Tia Rahmawati", "Wawan Kurnia", "Nia Ramadhani", "Iwan Setiadi",
];
const VENDOR = ["POJ", "PKSS", "EPS", "INHOUSE"];

const dataTad = NAMA_TAD.map((nama, i) => {
  const manual = i >= 13; // dua terakhir: input manual, belum terverifikasi
  const tanpaRekening = i === 12 || i === 14; // untuk uji "Data rekening TAD belum lengkap"
  const rekening = `0099010${String(i + 1).padStart(8, "0")}`; // 15 digit, format BRI
  return {
    nik: manual && i === 14 ? null : `647101${String(900000 + i).padStart(10, "0")}`,
    nama,
    namaBank: tanpaRekening ? null : "BRI",
    rekeningTerenkripsi: tanpaRekening ? null : enkripsi(rekening),
    vendor: VENDOR[i % VENDOR.length]!,
    unitKerja: UNIT[i % UNIT.length]![1],
    tglAkhirKontrak: i % 3 === 0 ? null : "2027-06-30",
    sumberData: manual ? ("input_manual" as const) : ("unggahan" as const),
    terverifikasi: !manual,
  };
});

const { db, pool } = buatDb();
try {
  const k = await db.insert(karyawan).values(dataKaryawan).onConflictDoNothing().returning({ id: karyawan.id });
  // TAD tanpa NIK tidak punya kunci unik; hanya ditambahkan bila belum ada TAD sama sekali.
  const adaTad = (await db.select({ id: tad.id }).from(tad).limit(1)).length > 0;
  const t = adaTad ? [] : await db.insert(tad).values(dataTad).returning({ id: tad.id });
  console.log(`Seed selesai: ${k.length} karyawan baru, ${t.length} TAD baru.`);
} finally {
  await pool.end();
}
