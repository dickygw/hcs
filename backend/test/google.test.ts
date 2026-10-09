import { generateKeyPairSync, sign } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { describe, expect, it } from "vitest";
import { domainSah, verifikasiIdToken } from "../src/auth/google.js";

const CLIENT_ID = "uji.apps.googleusercontent.com";
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");

/** Token yang bentuknya persis token Google, tetapi ditandatangani kunci palsu. */
function tokenPalsu() {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const kini = Math.floor(Date.now() / 1000);
  const isi = `${b64({ alg: "RS256", kid: "kunci-palsu", typ: "JWT" })}.${b64({
    iss: "https://accounts.google.com",
    aud: CLIENT_ID,
    email: "penyusup@pegadaian.co.id",
    email_verified: true,
    hd: "pegadaian.co.id",
    iat: kini,
    exp: kini + 3600,
  })}`;
  return `${isi}.${sign("RSA-SHA256", Buffer.from(isi), privateKey).toString("base64url")}`;
}

describe("Verifikasi token Google (AUTH-01)", () => {
  const client = new OAuth2Client({ clientId: CLIENT_ID });

  it("token bertanda tangan palsu ditolak", async () => {
    await expect(verifikasiIdToken(client, tokenPalsu(), CLIENT_ID)).rejects.toThrow();
  });

  it("token rusak ditolak", async () => {
    await expect(verifikasiIdToken(client, "bukan.token.google", CLIENT_ID)).rejects.toThrow();
  });
});

describe("Pembatasan domain (AUTH-02)", () => {
  const sah = { email: "rina@pegadaian.co.id", hd: "pegadaian.co.id", emailVerified: true };

  it("akun pegadaian.co.id terverifikasi diterima", () => expect(domainSah(sah)).toBe(true));
  it("Gmail pribadi ditolak", () => expect(domainSah({ email: "rina@gmail.com", emailVerified: true })).toBe(false));
  it("email belum terverifikasi ditolak", () => expect(domainSah({ ...sah, emailVerified: false })).toBe(false));
  it("klaim hd lain ditolak", () => expect(domainSah({ ...sah, hd: "contoh.co.id" })).toBe(false));
  it("hd benar tetapi alamat email lain ditolak", () =>
    expect(domainSah({ ...sah, email: "rina@pegadaian.co.id.palsu.com" })).toBe(false));
});
