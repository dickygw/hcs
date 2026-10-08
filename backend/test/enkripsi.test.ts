import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { dekripsi, enkripsi, samarkan } from "../src/enkripsi.js";

const REKENING = "001201000123456";

describe("Enkripsi rekening TAD (DATA-01)", () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
  });

  it("hasil enkripsi bisa dibuka kembali", () => {
    expect(dekripsi(enkripsi(REKENING))).toBe(REKENING);
  });

  it("hasil enkripsi berupa teks acak, bukan angka rekening", () => {
    const sandi = enkripsi(REKENING);
    expect(sandi).toMatch(/^v1:/);
    expect(sandi).not.toContain(REKENING);
  });

  it("rekening yang sama menghasilkan sandi berbeda setiap kali", () => {
    expect(enkripsi(REKENING)).not.toBe(enkripsi(REKENING));
  });

  it("sandi yang diutak-atik ditolak", () => {
    const sandi = enkripsi(REKENING);
    const data = Buffer.from(sandi.slice(3), "base64");
    data[data.length - 1]! ^= 1;
    expect(() => dekripsi("v1:" + data.toString("base64"))).toThrow();
  });

  it("kunci yang salah tidak bisa membuka sandi", () => {
    const sandi = enkripsi(REKENING);
    process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
    expect(() => dekripsi(sandi)).toThrow();
  });

  it("kunci yang panjangnya salah ditolak", () => {
    process.env.ENCRYPTION_KEY = randomBytes(16).toString("base64");
    expect(() => enkripsi(REKENING)).toThrow(/32 byte/);
  });

  it("tampilan tersamar hanya 4 digit terakhir", () => {
    expect(samarkan(REKENING)).toBe("••••3456");
  });
});
