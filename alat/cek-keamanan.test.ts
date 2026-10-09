// Membuktikan cek:keamanan menangkap pelanggaran yang disengaja (Build Plan Tahap 1).
import { describe, expect, it } from "vitest";
// @ts-expect-error modul .mjs tanpa deklarasi tipe
import { periksaKode, periksaManifest, periksaTitikMasuk } from "./cek-keamanan.mjs";

const manifestSah = {
  oauthScopes: ["https://www.googleapis.com/auth/userinfo.email"],
  webapp: { executeAs: "USER_DEPLOYING", access: "DOMAIN" },
};
const manifest = (ubah: object) => JSON.stringify({ ...manifestSah, ...ubah });

describe("cek:keamanan — appsscript.json", () => {
  it("manifest sah lolos", () => expect(periksaManifest(JSON.stringify(manifestSah))).toEqual([]));

  it("akses ANYONE atau dijalankan sebagai pengguna ditolak", () => {
    expect(periksaManifest(manifest({ webapp: { executeAs: "USER_DEPLOYING", access: "ANYONE_ANONYMOUS" } }))).toHaveLength(1);
    expect(periksaManifest(manifest({ webapp: { executeAs: "USER_ACCESSING", access: "DOMAIN" } }))).toHaveLength(1);
  });

  it("izin membaca Gmail atau Drive penuh ditolak", () => {
    const g = periksaManifest(manifest({ oauthScopes: ["https://mail.google.com/", "https://www.googleapis.com/auth/drive"] }));
    expect(g).toHaveLength(2);
  });

  it("API executable dan manifest tanpa daftar izin ditolak", () => {
    expect(periksaManifest(manifest({ executionApi: { access: "ANYONE" } }))).toHaveLength(1);
    expect(periksaManifest(manifest({ oauthScopes: undefined }))).toHaveLength(1);
  });
});

describe("cek:keamanan — kode", () => {
  const kasus = [
    "function doPost(e) {}",
    "ContentService.createTextOutput(data)",
    "file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, x)",
    "ss.addEditor('x@pegadaian.co.id')",
    "out.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)",
    "<?!= dataPengguna ?>",
    "el.innerHTML = nama",
    "<div dangerouslySetInnerHTML={{ __html: x }} />",
    "localStorage.setItem('k', v)",
    "eval(kode)",
    "UrlFetchApp.fetch('https://contoh.com')",
  ];
  it.each(kasus)("menangkap: %s", (isi) => expect(periksaKode("x.ts", isi)).toHaveLength(1));

  it("kode biasa lolos", () => expect(periksaKode("x.ts", "el.textContent = nama; panggil('status')")).toEqual([]));
});

describe("cek:keamanan — fungsi top-level", () => {
  it("hanya doGet dan api yang boleh", () => {
    expect(periksaTitikMasuk("function doGet(...a) {}\nfunction api(...a) {}")).toEqual([]);
    expect(periksaTitikMasuk("function api(...a) {}\nfunction hapusData(...a) {}")).toHaveLength(1);
  });
});
