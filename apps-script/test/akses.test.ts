import { describe, expect, it } from "vitest";
import { buatApi, GalatPengguna, type Peran, type Rute } from "../src/akses";

const RUTE: Record<string, Rute> = {
  status: { peran: ["domain"], jalankan: (_a, p) => ({ email: p.email }) },
  milikKaryawan: { peran: ["karyawan", "admin"], jalankan: () => "ok-karyawan" },
  khususAdmin: { peran: ["admin"], jalankan: () => "ok-admin" },
};

const api = (email: string, peran: Record<string, Peran> = {}) =>
  buatApi({ email: () => email, rute: RUTE, peranDari: (e) => peran[e] ?? null });

describe("Pembungkus pemeriksa (AKSES-01, AUTH-02)", () => {
  it("akun di luar pegadaian.co.id ditolak", () => {
    expect(() => api("rina@gmail.com")("status", {})).toThrow(GalatPengguna);
    expect(() => api("")("status", {})).toThrow("Akses ditolak.");
    expect(() => api("rina@pegadaian.co.id.palsu.com")("status", {})).toThrow("Akses ditolak.");
  });

  it("identitas diambil dari server, bukan dari isi permintaan", () => {
    const hasil = api("rina@pegadaian.co.id")("status", { email: "admin@pegadaian.co.id" });
    expect(hasil).toEqual({ email: "rina@pegadaian.co.id" });
  });

  it("rute yang tidak terdaftar ditolak (tolak secara bawaan)", () => {
    const a = api("rina@pegadaian.co.id", { "rina@pegadaian.co.id": "admin" });
    for (const nama of ["hapusSemua", "constructor", "__proto__", "toString", 123, null]) {
      expect(() => a(nama, {})).toThrow("Permintaan tidak dikenal.");
    }
  });

  it("email belum terdaftar hanya boleh memanggil rute domain", () => {
    const a = api("baru@pegadaian.co.id");
    expect(a("status", {})).toEqual({ email: "baru@pegadaian.co.id" });
    expect(() => a("milikKaryawan", {})).toThrow("Anda tidak memiliki akses");
  });

  it("karyawan tidak dapat memanggil rute Admin; Admin dapat", () => {
    const peran: Record<string, Peran> = { "k@pegadaian.co.id": "karyawan", "a@pegadaian.co.id": "admin" };
    expect(api("k@pegadaian.co.id", peran)("milikKaryawan", {})).toBe("ok-karyawan");
    expect(() => api("k@pegadaian.co.id", peran)("khususAdmin", {})).toThrow("Anda tidak memiliki akses");
    expect(api("a@pegadaian.co.id", peran)("khususAdmin", {})).toBe("ok-admin");
  });

  it("huruf besar dan spasi di email tidak membuka celah", () => {
    expect(api("  Rina@Pegadaian.co.id ")("status", {})).toEqual({ email: "rina@pegadaian.co.id" });
  });
});
