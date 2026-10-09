/**
 * Titik masuk Apps Script. HANYA fungsi yang diekspor dari file ini yang menjadi fungsi top-level
 * (alat/bangun.mjs). cek:keamanan memastikan ekspor hanya doGet, api, dan fungsi pemilik yang diawali hanyaPemilik().
 */
import { buatApi, GalatPengguna } from "./akses";
import { baca } from "./data";
import { peranDari } from "./peran";
import { RUTE } from "./rute";
import { pembatasSkrip, sesiSkrip } from "./sesi";

// Fungsi khusus pemilik (editor dan trigger); masing-masing diawali hanyaPemilik().
export { buatKunciRekening, cekBerbagi, isiDataDummy, jalankanMigrasi, pasangTrigger, tambahAdmin } from "./pemilik";

export function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("HCS · Human Capital System")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

const jalankan = buatApi({
  email: () => Session.getActiveUser().getEmail(),
  rute: RUTE,
  peranDari: (email) => peranDari(email, baca("pengguna"), baca("karyawan")),
  sesiAktif: (email) => sesiSkrip().aktif(email),
  dalamBatas: (email) => pembatasSkrip()(email),
});

/** Satu-satunya pintu dari browser (google.script.run.api). Galat ditandai kode: "[kode] pesan". */
export function api(nama: unknown, arg: unknown) {
  try {
    return jalankan(nama, arg);
  } catch (e) {
    if (e instanceof GalatPengguna) throw new Error(e.kode ? `[${e.kode}] ${e.message}` : e.message);
    console.error(e); // detail hanya di log Apps Script (WEB-05)
    throw new Error("Terjadi kesalahan pada server. Silakan coba lagi.");
  }
}
