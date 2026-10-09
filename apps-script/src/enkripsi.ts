/**
 * Enkripsi rekening TAD (DATA-01): AES-256-GCM dengan pustaka teraudit @noble/ciphers.
 * Format tersimpan: "v1:" + base64(nonce 12 byte + ciphertext + tag 16 byte).
 * Apps Script tidak punya TextEncoder maupun crypto.getRandomValues, jadi konversi teks dan
 * sumber acak disediakan di sini (sumber acak dapat diganti saat tes).
 */
import { gcm } from "@noble/ciphers/aes.js";

const AWALAN = "v1:";

export function teksKeByte(teks: string): Uint8Array {
  const biner = unescape(encodeURIComponent(teks)); // UTF-8 → satu karakter per byte
  return Uint8Array.from(biner, (c) => c.charCodeAt(0));
}

export function byteKeTeks(b: Uint8Array): string {
  let biner = "";
  for (const x of b) biner += String.fromCharCode(x);
  return decodeURIComponent(escape(biner));
}

const HURUF = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function keBase64(b: Uint8Array): string {
  let s = "";
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i]! << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    s += HURUF[(n >> 18) & 63]! + HURUF[(n >> 12) & 63]! + (i + 1 < b.length ? HURUF[(n >> 6) & 63]! : "=") + (i + 2 < b.length ? HURUF[n & 63]! : "=");
  }
  return s;
}

export function dariBase64(s: string): Uint8Array {
  const bersih = s.replace(/=+$/, "");
  const hasil: number[] = [];
  for (let i = 0; i < bersih.length; i += 4) {
    const n = [0, 1, 2, 3].reduce((a, j) => (a << 6) | Math.max(0, HURUF.indexOf(bersih[i + j] ?? "A")), 0);
    hasil.push((n >> 16) & 255);
    if (i + 2 < bersih.length) hasil.push((n >> 8) & 255);
    if (i + 3 < bersih.length) hasil.push(n & 255);
  }
  return Uint8Array.from(hasil);
}

export function enkripsi(teks: string, kunci: Uint8Array, nonce: Uint8Array): string {
  if (kunci.length !== 32) throw new Error("Kunci enkripsi harus 32 byte.");
  if (nonce.length !== 12) throw new Error("Nonce harus 12 byte.");
  const sandi = gcm(kunci, nonce).encrypt(teksKeByte(teks));
  const gabung = new Uint8Array(12 + sandi.length);
  gabung.set(nonce, 0);
  gabung.set(sandi, 12);
  return AWALAN + keBase64(gabung);
}

/** Gagal (throw) bila data diubah atau kunci salah: GCM memeriksa keaslian. */
export function dekripsi(tersimpan: string, kunci: Uint8Array): string {
  if (!tersimpan.startsWith(AWALAN)) throw new Error("Format rekening terenkripsi tidak dikenal.");
  const b = dariBase64(tersimpan.slice(AWALAN.length));
  return byteKeTeks(gcm(kunci, b.slice(0, 12)).decrypt(b.slice(12)));
}

/** Tampilan rekening untuk Admin: ••••1234 (PRD 6.4). Karyawan tidak pernah menerima rekening (AKSES-04). */
export function samarkan(rekening: string): string {
  const angka = rekening.replace(/\D/g, "");
  return angka ? "••••" + angka.slice(-4) : "";
}

// ---------------------------------------------------------------------------
// Apps Script: kunci dari Script Properties, nonce dari UUID acak
// ---------------------------------------------------------------------------
export const KUNCI_PROPERTI = "KUNCI_REKENING";

function hexKeByte(hex: string): Uint8Array {
  return Uint8Array.from(hex.match(/../g) ?? [], (h) => parseInt(h, 16));
}

/** 12 byte acak dari UUID v4 (Utilities.getUuid). Untuk GCM, nonce wajib unik; 96 bit acak sudah memadai. */
export function nonceBaru(): Uint8Array {
  return hexKeByte((Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, "").slice(0, 24));
}

/** 32 byte untuk kunci baru: SHA-256 dari tiga UUID acak (±366 bit acak). */
export function kunciAcakBaru(): string {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid());
  return keBase64(Uint8Array.from(digest, (x) => (x + 256) % 256));
}

export function kunciTersimpan(): Uint8Array {
  const k = PropertiesService.getScriptProperties().getProperty(KUNCI_PROPERTI);
  if (!k) throw new Error("Kunci enkripsi rekening belum dibuat. Jalankan buatKunciRekening.");
  return dariBase64(k);
}
