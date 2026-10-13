/**
 * Perubahan struktur data hanya lewat migrasi bernomor (WS-13). Migrasi yang sudah terpasang dicatat
 * di Script Properties sehingga aman dijalankan berulang. Ringkasan bahasa sederhana untuk AI-05.
 */
import { KUNCI_FOLDER, KUNCI_ID } from "./data";
import { lingkungan } from "./lingkungan";
import { TABEL, type Spreadsheet } from "./skema";

interface Migrasi {
  nomor: string;
  ringkasan: string;
  jalankan: () => void;
}

export const MIGRASI: Migrasi[] = [
  {
    nomor: "0001",
    ringkasan:
      "Membuat folder data privat (berisi folder Dokumen dan Backup) dan tiga spreadsheet: HCS_Master, HCS_Data, HCS_Log, " +
      "dengan satu sheet per tabel PRD 7.1. Semua kolom berformat teks; baris judul dibekukan.",
    jalankan: () => {
      const props = PropertiesService.getScriptProperties();
      const induk = DriveApp.createFolder(`HCS data (${lingkungan()})`);
      props.setProperty(KUNCI_FOLDER.data, induk.getId());
      props.setProperty(KUNCI_FOLDER.dokumen, induk.createFolder("Dokumen").getId());
      props.setProperty(KUNCI_FOLDER.backup, induk.createFolder("Backup").getId());

      const grup: Record<Spreadsheet, string[]> = { Master: [], Data: [], Log: [] };
      for (const [nama, def] of Object.entries(TABEL)) grup[def.spreadsheet].push(nama);

      for (const [ssNama, tabel] of Object.entries(grup) as [Spreadsheet, string[]][]) {
        const ss = SpreadsheetApp.create("HCS_" + ssNama);
        DriveApp.getFileById(ss.getId()).moveTo(induk);
        const bawaan = ss.getSheets()[0]!;
        for (const nama of tabel) {
          const kolom = TABEL[nama as keyof typeof TABEL].kolom;
          const sh = ss.insertSheet(nama);
          sh.getRange(1, 1, sh.getMaxRows(), kolom.length).setNumberFormat("@"); // teks: rumus tidak berjalan (INPUT-02)
          sh.getRange(1, 1, 1, kolom.length).setValues([[...kolom]]).setFontWeight("bold");
          sh.setFrozenRows(1);
          if (sh.getMaxColumns() > kolom.length) sh.deleteColumns(kolom.length + 1, sh.getMaxColumns() - kolom.length);
        }
        ss.deleteSheet(bawaan);
        props.setProperty(KUNCI_ID[ssNama], ss.getId());
      }
    },
  },
];

/** Menambah kolom di akhir sheet (data lama tidak bergeser). Aman dijalankan ulang. */
function tambahKolom_(ss: Spreadsheet, tabel: string, kolom: readonly string[]) {
  const id = PropertiesService.getScriptProperties().getProperty(KUNCI_ID[ss]);
  if (!id) throw new Error(`Spreadsheet HCS_${ss} belum ada. Migrasi 0001 harus terpasang dulu.`);
  const sh = SpreadsheetApp.openById(id).getSheetByName(tabel);
  if (!sh) throw new Error(`Sheet ${tabel} tidak ditemukan.`);
  const judul = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]!.map(String);
  const kurang = kolom.filter((k) => !judul.includes(k));
  if (!kurang.length) return;
  const mulai = sh.getLastColumn() + 1;
  if (sh.getMaxColumns() < mulai + kurang.length - 1) sh.insertColumnsAfter(sh.getMaxColumns(), mulai + kurang.length - 1 - sh.getMaxColumns());
  sh.getRange(1, mulai, sh.getMaxRows(), kurang.length).setNumberFormat("@"); // teks (INPUT-02)
  sh.getRange(1, mulai, 1, kurang.length).setValues([[...kurang]]).setFontWeight("bold");
}

/** Kolom yang ditambahkan migrasi 0002 dan 0003 di akhir sheet pengajuan (sama dengan skema.ts). */
export const KOLOM_0002 = ["kota_asal", "waktu_berangkat", "waktu_kembali", "nama_hotel", "catatan"];
export const KOLOM_0003 = ["kegiatan", "rincian_hitung", "disetujui_pada"];

MIGRASI.push(
  {
    nomor: "0002",
    ringkasan:
      "Menambah 5 kolom di akhir sheet pengajuan untuk Pemesanan Tiket Pesawat: kota_asal, waktu_berangkat, " +
      "waktu_kembali, nama_hotel, catatan. Data yang sudah ada tidak berubah; kolom baru berformat teks.",
    jalankan: () => tambahKolom_("Data", "pengajuan", KOLOM_0002),
  },
  {
    nomor: "0003",
    ringkasan:
      "Menambah 3 kolom di akhir sheet pengajuan untuk perhitungan SPPD: kegiatan (diisi karyawan), rincian_hitung " +
      "(isian dan hasil hitung Admin), disetujui_pada. Data yang sudah ada tidak berubah.",
    jalankan: () => tambahKolom_("Data", "pengajuan", KOLOM_0003),
  },
);

export function migrasiTertunda(terpasang: readonly string[]): Migrasi[] {
  return MIGRASI.filter((m) => !terpasang.includes(m.nomor));
}

export function jalankanSemua(): string[] {
  const props = PropertiesService.getScriptProperties();
  const terpasang: string[] = JSON.parse(props.getProperty("MIGRASI_TERPASANG") || "[]");
  const hasil: string[] = [];
  for (const m of migrasiTertunda(terpasang)) {
    m.jalankan();
    terpasang.push(m.nomor);
    props.setProperty("MIGRASI_TERPASANG", JSON.stringify(terpasang));
    hasil.push(`${m.nomor}: ${m.ringkasan}`);
  }
  return hasil;
}
