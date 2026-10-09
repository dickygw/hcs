import { OAuth2Client } from "google-auth-library";

export const DOMAIN = "pegadaian.co.id";

export interface KlaimGoogle {
  email: string;
  hd?: string;
  emailVerified: boolean;
}

/** Penghubung ke Google; diganti tiruan saat tes. */
export interface Google {
  urlMasuk(state: string): string;
  /** Tukar kode dari Google menjadi klaim yang tanda tangan, audience, dan masa berlakunya sudah diverifikasi. */
  verifikasiKode(kode: string): Promise<KlaimGoogle>;
}

function wajibEnv(nama: string) {
  const nilai = process.env[nama];
  if (!nilai) throw new Error(`${nama} belum diisi di .env`);
  return nilai;
}

export function buatGoogle(): Google {
  const clientId = wajibEnv("GOOGLE_CLIENT_ID");
  const client = new OAuth2Client({
    clientId,
    clientSecret: wajibEnv("GOOGLE_CLIENT_SECRET"),
    redirectUri: `${wajibEnv("APP_URL")}/api/auth/google/callback`,
  });

  return {
    urlMasuk: (state) =>
      client.generateAuthUrl({ scope: ["openid", "email", "profile"], state, hd: DOMAIN, prompt: "select_account" }),
    async verifikasiKode(kode) {
      const { tokens } = await client.getToken(kode);
      if (!tokens.id_token) throw new Error("Google tidak mengirim id_token.");
      return verifikasiIdToken(client, tokens.id_token, clientId);
    },
  };
}

/** AUTH-01: tanda tangan, audience, penerbit, dan masa berlaku diperiksa oleh pustaka resmi Google. */
export async function verifikasiIdToken(client: OAuth2Client, idToken: string, clientId: string): Promise<KlaimGoogle> {
  const payload = (await client.verifyIdToken({ idToken, audience: clientId })).getPayload();
  if (!payload?.email) throw new Error("Token Google tanpa email.");
  return { email: payload.email.toLowerCase(), hd: payload.hd, emailVerified: payload.email_verified === true };
}

/** AUTH-02: hanya akun Google Workspace pegadaian.co.id dengan email terverifikasi. */
export function domainSah(k: KlaimGoogle) {
  return k.hd === DOMAIN && k.emailVerified && k.email.endsWith(`@${DOMAIN}`);
}
