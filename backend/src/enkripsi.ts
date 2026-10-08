import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Enkripsi data sensitif (rekening TAD) dengan AES-256-GCM (DATA-01).
 * Format hasil: "v1:" + base64(iv 12 byte | tag 16 byte | isi terenkripsi).
 * GCM juga mendeteksi bila isi di database diutak-atik.
 */
const VERSI = "v1:";

function kunci(): Buffer {
  const k = Buffer.from(process.env.ENCRYPTION_KEY ?? "", "base64");
  if (k.length !== 32) throw new Error("ENCRYPTION_KEY harus 32 byte dalam format base64.");
  return k;
}

export function enkripsi(teks: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", kunci(), iv);
  const isi = Buffer.concat([cipher.update(teks, "utf8"), cipher.final()]);
  return VERSI + Buffer.concat([iv, cipher.getAuthTag(), isi]).toString("base64");
}

export function dekripsi(sandi: string): string {
  if (!sandi.startsWith(VERSI)) throw new Error("Format data terenkripsi tidak dikenal.");
  const data = Buffer.from(sandi.slice(VERSI.length), "base64");
  const decipher = createDecipheriv("aes-256-gcm", kunci(), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8");
}

/** Tampilan tersamar untuk Admin (PRD 6.4): ••••1234 */
export function samarkan(rekening: string): string {
  return "••••" + rekening.slice(-4);
}
