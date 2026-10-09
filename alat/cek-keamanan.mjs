/**
 * npm run cek:keamanan — pemeriksaan otomatis Standar Keamanan v1.3 (AI-02). Gagal (kode keluar 1) bila:
 * - appsscript.json melonggarkan deployment atau meminta izin di luar daftar (WS-01, WS-05, WEB-04);
 * - kode memakai pola terlarang: doPost, ContentService, berbagi file, ALLOWALL, scriptlet tanpa escape,
 *   innerHTML, penyimpanan browser, eval (WEB-01..04, WEB-06, FILE-05);
 * - fungsi top-level selain doGet/api (semua panggilan browser wajib lewat pembungkus AKSES-01),
 *   kecuali fungsi pemilik di pemilik.ts yang baris pertamanya hanyaPemilik().
 * Jalankan setelah npm run build (memeriksa juga apps-script/dist).
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { pathToFileURL } from "node:url";

const IZIN_BOLEH = new Set([
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive", // DriveApp butuh izin penuh; hanya folder milik HCS yang dipakai (WS-03)
  "https://www.googleapis.com/auth/script.send_mail",
  "https://www.googleapis.com/auth/script.scriptapp", // trigger (WS-10)
]);

const POLA_TERLARANG = [
  [/\bdoPost\b/, "doPost dilarang (WEB-03)"],
  [/\bContentService\b/, "ContentService dilarang (WEB-04)"],
  [/\.setSharing\s*\(/, "setSharing dilarang (FILE-05)"],
  [/\.add(Editor|Viewer|Commenter)s?\s*\(/, "menambah editor/pembaca dilarang (FILE-05, WS-03)"],
  [/\bALLOWALL\b/, "XFrameOptionsMode.ALLOWALL dilarang (WEB-02)"],
  [/<\?!=/, "scriptlet tanpa escape <?!= dilarang (WEB-01)"],
  [/\.innerHTML\b|\.outerHTML\s*=|insertAdjacentHTML|dangerouslySetInnerHTML/, "menyisipkan HTML dilarang (WEB-01)"],
  [/\b(localStorage|sessionStorage|indexedDB)\b|document\.cookie/, "penyimpanan browser dilarang (WEB-06)"],
  [/\beval\s*\(|new Function\s*\(/, "eval/new Function dilarang"],
  [/\bUrlFetchApp\b/, "akses ke situs luar tidak diizinkan (data tetap di Workspace)"],
];

const EKSPOR_BOLEH = new Set(["doGet", "api"]);

export function periksaManifest(teks) {
  const galat = [];
  let m;
  try {
    m = JSON.parse(teks);
  } catch {
    return ["appsscript.json bukan JSON yang sah"];
  }
  if (m.webapp?.executeAs !== "USER_DEPLOYING") galat.push('webapp.executeAs harus "USER_DEPLOYING" (WS-01)');
  if (m.webapp?.access !== "DOMAIN") galat.push('webapp.access harus "DOMAIN" (AUTH-01, WS-01)');
  if (m.executionApi) galat.push("executionApi dilarang (WEB-04)");
  if (!Array.isArray(m.oauthScopes) || m.oauthScopes.length === 0) galat.push("oauthScopes wajib ditulis eksplisit (WS-05)");
  for (const s of m.oauthScopes ?? []) if (!IZIN_BOLEH.has(s)) galat.push(`izin tidak diizinkan: ${s} (WS-05)`);
  return galat;
}

export function periksaKode(nama, isi) {
  return POLA_TERLARANG.filter(([pola]) => pola.test(isi)).map(([, pesan]) => `${nama}: ${pesan}`);
}

/** pemilik.ts: setiap fungsi yang diekspor wajib diawali hanyaPemilik(). Mengembalikan nama yang sah dan galat. */
export function periksaPemilik(isi) {
  const semua = [...isi.matchAll(/export\s+function\s+([A-Za-z0-9_$]+)\s*\(/g)].map((m) => m[1]);
  const sah = new Set([...isi.matchAll(/export\s+function\s+([A-Za-z0-9_$]+)\s*\([^)]*\)\s*\{\s*hanyaPemilik\(\);/g)].map((m) => m[1]));
  return { sah, galat: semua.filter((n) => !sah.has(n)).map((n) => `pemilik.ts: fungsi "${n}" wajib diawali hanyaPemilik()`) };
}

/** Bundel Code.js: hanya fungsi top-level yang diizinkan. */
export function periksaTitikMasuk(isiBundel, fungsiPemilik = new Set()) {
  const nama = [...isiBundel.matchAll(/^function\s+([A-Za-z0-9_$]+)\s*\(/gm)].map((m) => m[1]);
  return nama
    .filter((n) => !EKSPOR_BOLEH.has(n) && !fungsiPemilik.has(n))
    .map((n) => `fungsi top-level "${n}" tidak diizinkan; daftarkan sebagai rute (AKSES-01)`);
}

function daftarBerkas(folder, akhiran) {
  if (!existsSync(folder)) return [];
  return readdirSync(folder).flatMap((f) => {
    const jalur = folder + "/" + f;
    return statSync(jalur).isDirectory() ? daftarBerkas(jalur, akhiran) : akhiran.some((a) => f.endsWith(a)) ? [jalur] : [];
  });
}

function jalankan() {
  const akar = new URL("../", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
  const galat = [...periksaManifest(readFileSync(akar + "apps-script/appsscript.json", "utf8"))];

  const sumber = [...daftarBerkas(akar + "apps-script/src", [".ts"]), ...daftarBerkas(akar + "tampilan/src", [".ts", ".tsx", ".html"])];
  for (const f of sumber) galat.push(...periksaKode(f.replace(akar, ""), readFileSync(f, "utf8")));

  const pemilik = existsSync(akar + "apps-script/src/pemilik.ts")
    ? periksaPemilik(readFileSync(akar + "apps-script/src/pemilik.ts", "utf8"))
    : { sah: new Set(), galat: [] };
  galat.push(...pemilik.galat);

  const bundel = akar + "apps-script/dist/Code.js";
  if (!existsSync(bundel)) galat.push("apps-script/dist/Code.js belum ada; jalankan npm run build dulu");
  else {
    galat.push(...periksaTitikMasuk(readFileSync(bundel, "utf8"), pemilik.sah));
    galat.push(...periksaManifest(readFileSync(akar + "apps-script/dist/appsscript.json", "utf8")).map((g) => "dist: " + g));
  }

  console.log(`Memeriksa appsscript.json, ${sumber.length} file sumber, dan bundel.\n`);
  if (galat.length) {
    galat.forEach((g) => console.log("  GAGAL  " + g));
    console.log(`\n${galat.length} pelanggaran.`);
    process.exit(1);
  }
  console.log("  LOLOS  Semua pemeriksaan keamanan.");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) jalankan();
