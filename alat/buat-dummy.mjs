/**
 * Membuat file unggahan DUMMY untuk menguji Tahap 4 (tanpa data asli):
 * - HCMS_dummy_benar.xlsx: 93 kolom seperti ekspor HCMS (12 dipakai + 81 kolom lain berisi data rekaan,
 *   termasuk kolom sensitif yang wajib dibuang), ±900 karyawan; 30 pertama = data dummy HCS-dev dengan perubahan.
 * - HCMS_dummy_kolom_salah.xlsx: dua kolom wajib hilang/berganti nama.
 * - TAD_dummy.xlsx: template TAD dengan baris bermasalah (rekening 14 digit, NIK ganda, NIK salah, rekening kosong).
 * Jalankan dari folder proyek: npm run buat:dummy (dibundel esbuild karena memakai modul TypeScript)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateRawSync } from "node:zlib";
import { buatDataDummy } from "../apps-script/src/dummy.ts";
import { KOLOM_HCMS, KOLOM_TAD } from "../apps-script/src/master.ts";
import { buatXlsx } from "../tampilan/src/xlsx.ts";

let benih = 20261013;
const acak = () => ((benih = (benih * 1103515245 + 12345) % 2147483648) / 2147483648);
const angka = (n) => Array.from({ length: n }, () => Math.floor(acak() * 10)).join("");
const pilih = (a) => a[Math.floor(acak() * a.length)];

const folder = "contoh-dummy/"; // relatif terhadap folder proyek
mkdirSync(folder, { recursive: true });
const simpan = (nama, sheet, tabel) => {
  writeFileSync(folder + nama, buatXlsx(sheet, tabel, (d) => new Uint8Array(deflateRawSync(d))));
  console.log(`contoh-dummy/${nama}: ${tabel.length - 1} baris, ${tabel[0].length} kolom`);
};

// --- HCMS: 12 kolom dipakai + 81 kolom lain (nama rekaan; sebagian meniru kolom sensitif agar terbukti dibuang)
const SENSITIF = ["NIK KTP", "NO KK", "NPWP", "NO BPJS KESEHATAN", "NO BPJS TK", "NO REKENING", "NAMA BANK", "ALAMAT KTP", "ALAMAT DOMISILI", "AGAMA", "TANGGAL LAHIR", "TEMPAT LAHIR", "NO TELEPON", "STATUS PAJAK", "NAMA IBU KANDUNG"];
const LAIN = [...SENSITIF, ...Array.from({ length: 81 - SENSITIF.length }, (_, i) => `KOLOM LAIN ${String(i + 1).padStart(2, "0")}`)];
const JUDUL_HCMS = [...Object.keys(KOLOM_HCMS), ...LAIN];
const isiLain = (kolom) =>
  kolom === "NIK KTP" ? "6471" + angka(12) : kolom === "NPWP" ? angka(15) : kolom === "NO REKENING" ? angka(15) : kolom === "NO TELEPON" ? "08" + angka(10) : kolom === "TANGGAL LAHIR" ? `19${70 + Math.floor(acak() * 30)}-0${1 + Math.floor(acak() * 9)}-1${Math.floor(acak() * 9)}` : "dummy";

const dasar = buatDataDummy({ kini: "", acak, idBaru: () => "", enkripsi: (t) => t });
const UNIT = [["CP1105", "CP Bontang", "Area Samarinda", "Operasional"], ["CP1106", "CP Balikpapan Baru", "Area Balikpapan", "Operasional"], ...dasar.karyawan.slice(0, 6).map((k) => [k.kode_unit_kerja, k.nama_unit_kerja, k.branch_name, k.dep_name])];
const karyawan = dasar.karyawan.slice(0, 27).map((k) => ({ ...k })); // 3 terakhir tidak ada lagi → dinonaktifkan
[[2, "14"], [6, "11"], [8, "9"], [10, "8"], [12, "7"]].forEach(([i, jg]) => (karyawan[i].kode_job_grade = jg)); // 2 pindah golongan
[3, 9, 15, 21].forEach((i) => Object.assign(karyawan[i], { kode_unit_kerja: "CP1105", nama_unit_kerja: "CP Bontang", branch_name: "Area Samarinda" }));
for (let i = 31; i <= 900; i++) {
  const jg = pilih([4, 5, 6, 7, 8, 9, 10, 10, 11, 12, 13, 14, 15]);
  const [kode, unit, branch, dep] = pilih(UNIT);
  karyawan.push({
    nik_pendek: "P9" + String(i).padStart(4, "0"), nama: `Karyawan Dummy ${String(i).padStart(3, "0")}`, prim_email: `karyawan${i}@contoh.test`,
    emp_type_name: "Pegawai Tetap", kode_job_grade: String(jg), job_grade_def: String(jg), position_type_name: "Struktural",
    position_name: jg >= 14 ? "Kepala Bagian" : jg >= 11 ? "Manajer" : "Staf", kode_unit_kerja: kode, nama_unit_kerja: unit, branch_name: branch, dep_name: dep,
  });
}
const barisHcms = karyawan.map((k) => [...Object.values(KOLOM_HCMS).map((f) => k[f] ?? ""), ...LAIN.map(isiLain)]);
simpan("HCMS_dummy_benar.xlsx", "Export HCMS", [JUDUL_HCMS, ...barisHcms]);

const judulSalah = JUDUL_HCMS.map((j) => (j === "PRIM EMAIL" ? "EMAIL KANTOR" : j === "KODE JOB GRADE" ? "JOB GRADE" : j));
simpan("HCMS_dummy_kolom_salah.xlsx", "Export HCMS", [judulSalah, ...barisHcms.slice(0, 50)]);

// --- TAD: 13 dari 15 TAD dummy + 4 baru + baris bermasalah
const tad = dasar.tad.slice(0, 13).map((t) => [t.nik, t.nama, "BRI", "0" + angka(14), t.vendor, t.unit_kerja, ""]);
tad[0][6] = "31-12-2026";
tad[1][6] = "2027-06-30";
tad[2][6] = "belum tahu"; // tanggal tidak dikenal → dikosongkan
for (let i = 16; i <= 19; i++) tad.push(["6471" + angka(12), `TAD Dummy ${i}`, "BRI", "0" + angka(14), pilih(["POJ", "PKSS", "EPS", "INHOUSE"]), "CP Balikpapan", ""]);
tad.push(["6471" + angka(12), "TAD Rekening Pendek", "BRI", angka(14), "POJ", "CP Samarinda", ""]); // 14 digit → ditolak
tad.push([tad[3][0], "TAD NIK Ganda", "BRI", "0" + angka(14), "PKSS", "CP Tarakan", ""]); // NIK sama dengan baris 5
tad.push(["6471" + angka(10), "TAD NIK Salah", "BRI", "0" + angka(14), "EPS", "CP Tarakan", ""]); // 14 digit NIK
tad.push(["6471" + angka(12), "TAD Tanpa Rekening", "", "", "INHOUSE", "Kantor Wilayah IV Balikpapan", ""]); // dicatat, rekening kosong
tad.push(["6471" + angka(12), "TAD Rumus", "BRI", "0" + angka(14), "=1+1", "CP Balikpapan", ""]); // rumus harus jadi teks
simpan("TAD_dummy.xlsx", "Template Unggah TAD", [Object.keys(KOLOM_TAD), ...tad]);
