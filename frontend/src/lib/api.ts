// Pemanggil API backend. Cookie sesi dikirim otomatis oleh browser (HttpOnly, tidak bisa dibaca di sini).

export const DIAM_MAKS_MS = 15 * 60 * 1000; // sama dengan batas di backend (AUTH-05)
export const EVENT_SESI_BERAKHIR = "hcs:sesi-berakhir";

let csrf = "";
let aktivitasTerakhir = Date.now();

export const aturCsrf = (token: string) => {
  csrf = token;
};
export const diamSejak = () => aktivitasTerakhir;

export async function api(alamat: string, init: RequestInit = {}) {
  aktivitasTerakhir = Date.now();
  const res = await fetch(alamat, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      ...init.headers,
    },
  });
  if (res.status === 401) window.dispatchEvent(new Event(EVENT_SESI_BERAKHIR));
  return res;
}

export type Peran = "karyawan" | "admin";
export const BERANDA: Record<Peran, string> = { karyawan: "/pengajuan", admin: "/admin" };
