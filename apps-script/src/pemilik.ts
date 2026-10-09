/**
 * Fungsi khusus pemilik (akun unit), dijalankan dari editor Apps Script atau trigger.
 * Fungsi ini menjadi fungsi top-level sehingga terlihat oleh google.script.run; karena itu SETIAP fungsi
 * wajib diawali hanyaPemilik() (diperiksa cek:keamanan).
 */
import { denganKunci, gantiSemua, idBaru, sekarang } from "./data";
import { buatDataDummy } from "./dummy";
import { enkripsi, KUNCI_PROPERTI, kunciAcakBaru, kunciTersimpan, nonceBaru } from "./enkripsi";
import { lingkungan } from "./lingkungan";
import { jalankanSemua, KUNCI_FOLDER } from "./migrasi";

function hanyaPemilik() {
  const aktif = Session.getActiveUser().getEmail();
  if (!aktif || aktif !== Session.getEffectiveUser().getEmail()) {
    throw new Error("Hanya pemilik proyek (akun unit) yang dapat menjalankan fungsi ini.");
  }
}

/** Membuat struktur data yang belum ada (WS-13). Aman dijalankan berulang. */
export function jalankanMigrasi() {
  hanyaPemilik();
  const hasil = jalankanSemua();
  console.log(hasil.length ? "Migrasi dipasang:\n" + hasil.join("\n") : "Tidak ada migrasi baru.");
}

/** Membuat kunci enkripsi rekening di Script Properties (DATA-02). Nilainya tidak pernah ditampilkan. */
export function buatKunciRekening() {
  hanyaPemilik();
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty(KUNCI_PROPERTI)) {
    throw new Error("Kunci sudah ada. Kunci tidak boleh ditimpa: rekening yang sudah terenkripsi tidak akan bisa dibuka.");
  }
  props.setProperty(KUNCI_PROPERTI, kunciAcakBaru());
  console.log(`Kunci enkripsi rekening dibuat untuk lingkungan ${lingkungan()} (nilai tidak ditampilkan).`);
}

/** Mengisi data dummy. Hanya di HCS-dev. */
export function isiDataDummy() {
  hanyaPemilik();
  if (lingkungan() !== "dev") throw new Error("Data dummy hanya boleh diisi di HCS-dev.");
  const kunci = kunciTersimpan();
  const data = buatDataDummy({ kini: sekarang(), acak: Math.random, idBaru, enkripsi: (t) => enkripsi(t, kunci, nonceBaru()) });
  denganKunci(() => {
    gantiSemua("karyawan", data.karyawan);
    gantiSemua("tad", data.tad);
    gantiSemua("tarif_sppd", data.tarif_sppd);
    gantiSemua("jenis_layanan", data.jenis_layanan);
  });
  console.log(`Data dummy: ${data.karyawan.length} karyawan, ${data.tad.length} TAD, ${data.tarif_sppd.length} tarif, ${data.jenis_layanan.length} jenis layanan.`);
}

/** WS-03, WS-04: laporkan file HCS atau proyek kode yang dibagikan ke selain akun unit. */
export function cekBerbagi() {
  hanyaPemilik();
  const temuan: string[] = [];
  const periksa = (item: GoogleAppsScript.Drive.File | GoogleAppsScript.Drive.Folder, jalur: string) => {
    if (item.getSharingAccess() !== DriveApp.Access.PRIVATE || item.getEditors().length || item.getViewers().length) temuan.push(jalur);
  };
  const telusuri = (folder: GoogleAppsScript.Drive.Folder, jalur: string) => {
    periksa(folder, jalur + "/");
    const file = folder.getFiles();
    while (file.hasNext()) {
      const f = file.next();
      periksa(f, jalur + "/" + f.getName());
    }
    const sub = folder.getFolders();
    while (sub.hasNext()) {
      const s = sub.next();
      telusuri(s, jalur + "/" + s.getName());
    }
  };
  const idData = PropertiesService.getScriptProperties().getProperty(KUNCI_FOLDER.data);
  if (idData) telusuri(DriveApp.getFolderById(idData), "HCS data");
  periksa(DriveApp.getFileById(ScriptApp.getScriptId()), "Proyek kode Apps Script");

  if (temuan.length) {
    const pesan = "File HCS yang dibagikan ke selain akun unit:\n- " + temuan.join("\n- ");
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), `[HCS ${lingkungan()}] Peringatan: file dibagikan`, pesan);
    console.log(pesan);
  } else {
    console.log("Aman: 0 file HCS dibagikan.");
  }
}

/** Memasang trigger mingguan cekBerbagi (Senin 07.00 WITA). Aman dijalankan berulang (WS-10). */
export function pasangTrigger() {
  hanyaPemilik();
  for (const t of ScriptApp.getProjectTriggers()) if (t.getHandlerFunction() === "cekBerbagi") ScriptApp.deleteTrigger(t);
  ScriptApp.newTrigger("cekBerbagi").timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(7).create();
  console.log("Trigger cekBerbagi dipasang: setiap Senin pukul 07.00.");
}
