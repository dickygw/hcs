import { randomBytes } from "node:crypto";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { describe, expect, it } from "vitest";
import { buatDataDummy } from "../src/dummy";
import { byteKeTeks, dariBase64, dekripsi, enkripsi, keBase64, samarkan, teksKeByte } from "../src/enkripsi";

const kunci = randomBytes(32);
const nonce = () => randomBytes(12);

describe("Enkripsi rekening AES-256-GCM (DATA-01)", () => {
  it("dapat dibuka kembali dengan kunci yang sama", () => {
    const s = enkripsi("012345678901234", kunci, nonce());
    expect(dekripsi(s, kunci)).toBe("012345678901234");
  });

  it("hasil berupa teks acak, bukan angka; dua kali enkripsi berbeda", () => {
    const a = enkripsi("012345678901234", kunci, nonce());
    const b = enkripsi("012345678901234", kunci, nonce());
    expect(a).toMatch(/^v1:[A-Za-z0-9+/=]+$/);
    expect(a).not.toContain("012345678901234");
    expect(a).not.toBe(b);
  });

  it("kunci salah atau data diubah → gagal dibuka", () => {
    const s = enkripsi("012345678901234", kunci, nonce());
    expect(() => dekripsi(s, randomBytes(32))).toThrow();
    const rusak = s.slice(0, -4) + (s.endsWith("AAAA") ? "BBBB" : "AAAA");
    expect(() => dekripsi(rusak, kunci)).toThrow();
  });

  it("menolak kunci dan nonce dengan ukuran salah", () => {
    expect(() => enkripsi("1", randomBytes(16), nonce())).toThrow("32 byte");
    expect(() => enkripsi("1", kunci, randomBytes(8))).toThrow("12 byte");
  });

  it("konversi teks dan base64 buatan sendiri setara bawaan Node", () => {
    const teks = "Rekening ••••1234 — ä";
    expect(Buffer.from(teksKeByte(teks)).toString("utf8")).toBe(teks);
    expect(byteKeTeks(new Uint8Array(Buffer.from(teks)))).toBe(teks);
    for (const n of [0, 1, 2, 3, 31, 32, 33]) {
      const b = randomBytes(n);
      expect(keBase64(b)).toBe(b.toString("base64"));
      expect(Buffer.from(dariBase64(b.toString("base64")))).toEqual(b);
    }
  });

  it("tampilan tersamar hanya 4 angka terakhir", () => {
    expect(samarkan("012345678901234")).toBe("••••1234");
    expect(samarkan("")).toBe("");
  });
});

describe("Enkripsi berjalan di lingkungan seperti Apps Script", () => {
  it("tanpa TextEncoder, crypto, maupun atob", async () => {
    const hasil = await build({
      stdin: { contents: `import { enkripsi, dekripsi } from "./src/enkripsi"; globalThis.uji = { enkripsi, dekripsi };`, resolveDir: "apps-script", loader: "ts" },
      bundle: true,
      format: "iife",
      write: false,
    });
    const konteks: Record<string, unknown> = { Uint8Array, unescape, escape, encodeURIComponent, decodeURIComponent };
    konteks.globalThis = konteks;
    runInNewContext(hasil.outputFiles[0]!.text, konteks);
    const { enkripsi: enk, dekripsi: dek } = konteks.uji as { enkripsi: typeof enkripsi; dekripsi: typeof dekripsi };
    const k = new Uint8Array(randomBytes(32));
    expect(dek(enk("012345678901234", k, new Uint8Array(randomBytes(12))), k)).toBe("012345678901234");
  });
});

describe("Data dummy", () => {
  const data = buatDataDummy({ kini: "2026-10-09T00:00:00.000Z", acak: Math.random, idBaru: () => String(Math.random()), enkripsi: (t) => enkripsi(t, kunci, nonce()) });

  it("30 karyawan, 15 TAD, 19 tarif, 4 jenis layanan; email bukan domain asli", () => {
    expect(data.karyawan).toHaveLength(30);
    expect(data.tad).toHaveLength(15);
    expect(data.tarif_sppd).toHaveLength(19);
    expect(data.jenis_layanan).toHaveLength(4);
    expect(data.karyawan.every((k) => k.prim_email!.endsWith("@contoh.test"))).toBe(true);
  });

  it("rekening TAD tersimpan terenkripsi, 15 digit setelah dibuka; 2 TAD tanpa rekening", () => {
    const berisi = data.tad.filter((t) => t.rekening_terenkripsi);
    expect(berisi).toHaveLength(13);
    for (const t of berisi) {
      expect(t.rekening_terenkripsi).not.toMatch(/^\d+$/);
      expect(dekripsi(t.rekening_terenkripsi!, kunci)).toMatch(/^\d{15}$/);
    }
  });
});
