/**
 * npm run build → apps-script/dist/ berisi Code.js, Index.html, appsscript.json (siap clasp push).
 *
 * Server: esbuild membundel apps-script/src/main.ts. Apps Script hanya mengenal fungsi top-level,
 * jadi setiap ekspor main.ts dibuatkan fungsi pendek yang meneruskan ke bundel (mis. function api(...)).
 * Tampilan: Vite membangun tampilan/, lalu JS dan CSS disisipkan ke satu Index.html (HtmlService
 * tidak melayani file terpisah). Huruf dan gambar sudah berupa data URI.
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { build as esbuild } from "esbuild";
import { build as vite } from "vite";
import react from "@vitejs/plugin-react";

const AKAR = new URL("../", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const DIST = AKAR + "apps-script/dist/";
const ENTRI = AKAR + "apps-script/src/main.ts";

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

// --- Server -----------------------------------------------------------------
const metafile = (await esbuild({ entryPoints: [ENTRI], bundle: true, format: "esm", write: false, metafile: true, outdir: "x" })).metafile;
export const ekspor = Object.values(metafile.outputs).flatMap((o) => o.exports ?? []);

const bundel = await esbuild({
  entryPoints: [ENTRI],
  bundle: true,
  format: "iife",
  globalName: "HCS",
  target: "es2020",
  charset: "utf8",
  write: false,
});
const titikMasuk = ekspor.map((n) => `function ${n}(...a) { return HCS.${n}(...a); }`).join("\n");
writeFileSync(DIST + "Code.js", `${bundel.outputFiles[0].text}\n// Fungsi top-level untuk Apps Script (dibuat alat/bangun.mjs)\n${titikMasuk}\n`);
copyFileSync(AKAR + "apps-script/appsscript.json", DIST + "appsscript.json");

// --- Tampilan ---------------------------------------------------------------
const keluarVite = AKAR + "tampilan/dist/";
await vite({
  root: AKAR + "tampilan",
  base: "./",
  logLevel: "warn",
  plugins: [react()],
  build: {
    outDir: keluarVite,
    emptyOutDir: true,
    assetsInlineLimit: 10_000_000, // huruf dan gambar disematkan sebagai data URI
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: { output: { format: "iife" } },
  },
});

const berkas = readdirSync(keluarVite + "assets");
const js = berkas.filter((f) => f.endsWith(".js")).map((f) => readFileSync(keluarVite + "assets/" + f, "utf8")).join("\n");
const css = berkas.filter((f) => f.endsWith(".css")).map((f) => readFileSync(keluarVite + "assets/" + f, "utf8")).join("\n");
const html = readFileSync(keluarVite + "index.html", "utf8")
  .replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, "")
  .replace(/<link[^>]*rel="stylesheet"[^>]*>/g, "")
  .replace("</head>", () => `<style>${css}</style>\n</head>`)
  // skrip di akhir body (format iife, bukan module) setelah elemen #akar ada
  .replace("</body>", () => `<script>${js.replace(/<\/script/gi, "<\\/script")}</script>\n</body>`);
writeFileSync(DIST + "Index.html", html);
rmSync(keluarVite, { recursive: true, force: true });

const kb = (f) => Math.round(readFileSync(DIST + f).length / 1024);
console.log(`Build selesai: Code.js ${kb("Code.js")} KB, Index.html ${kb("Index.html")} KB. Fungsi top-level: ${ekspor.join(", ")}`);
