/**
 * Perubahan struktur data hanya lewat migrasi bernomor (WS-13). Migrasi yang sudah terpasang dicatat
 * di Script Properties sehingga aman dijalankan berulang. Ringkasan bahasa sederhana untuk AI-05.
 */
import { KUNCI_ID } from "./data";
import { lingkungan } from "./lingkungan";
import { TABEL, type Spreadsheet } from "./skema";

export const KUNCI_FOLDER = { data: "ID_FOLDER_DATA", dokumen: "ID_FOLDER_DOKUMEN", backup: "ID_FOLDER_BACKUP" } as const;

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
