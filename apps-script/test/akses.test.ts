import { describe, expect, it } from "vitest";
import { buatApi, GalatPengguna, type Peran, type Rute } from "../src/akses";
import { peranDari, profilDari } from "../src/peran";
import { buatPembatas, buatSesi, DIAM_DETIK, MAKS_MS, type Cache } from "../src/sesi";
import type { Baris } from "../src/skema";

const RUTE: Record<string, Rute> = {
  mulai: { peran: ["domain"], tanpaSesi: true, jalankan: (_a, p) => ({ email: p.email }) },
  milikKaryawan: { peran: ["karyawan", "admin"], jalankan: () => "ok-karyawan" },
  khususAdmin: { peran: ["admin"], jalankan: () => "ok-admin" },
};

function api(email: string, opsi: { peran?: Record<string, Peran>; sesi?: boolean; batas?: boolean } = {}) {
  return buatApi({
    email: () => email,
    rute: RUTE,
    peranDari: (e) => opsi.peran?.[e] ?? null,
    sesiAktif: () => opsi.sesi ?? true,
    dalamBatas: () => opsi.batas ?? true,
  });
}
const galat = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e as GalatPengguna;
  }
  throw new Error("tidak ada galat");
};

describe("Pembungkus pemeriksa (AKSES-01, AUTH-02)", () => {
  it("akun di luar pegadaian.co.id ditolak", () => {
    expect(() => api("rina@gmail.com")("mulai", {})).toThrow(GalatPengguna);
    expect(() => api("")("mulai", {})).toThrow("Akses ditolak.");
    expect(() => api("rina@pegadaian.co.id.palsu.com")("mulai", {})).toThrow("Akses ditolak.");
  });

  it("identitas diambil dari server, bukan dari isi permintaan", () => {
    expect(api("rina@pegadaian.co.id")("mulai", { email: "admin@pegadaian.co.id" })).toEqual({ email: "rina@pegadaian.co.id" });
  });

  it("rute yang tidak terdaftar ditolak (tolak secara bawaan)", () => {
    const a = api("rina@pegadaian.co.id", { peran: { "rina@pegadaian.co.id": "admin" } });
    for (const nama of ["hapusSemua", "constructor", "__proto__", "toString", 123, null]) {
      expect(() => a(nama, {})).toThrow("Permintaan tidak dikenal.");
    }
  });

  it("email belum terdaftar hanya boleh memanggil rute domain", () => {
    const a = api("baru@pegadaian.co.id");
    expect(a("mulai", {})).toEqual({ email: "baru@pegadaian.co.id" });
    expect(() => a("milikKaryawan", {})).toThrow("Anda tidak memiliki akses");
  });

  it("karyawan tidak dapat memanggil rute Admin; Admin dapat", () => {
    const peran: Record<string, Peran> = { "k@pegadaian.co.id": "karyawan", "a@pegadaian.co.id": "admin" };
    expect(api("k@pegadaian.co.id", { peran })("milikKaryawan", {})).toBe("ok-karyawan");
    expect(() => api("k@pegadaian.co.id", { peran })("khususAdmin", {})).toThrow("Anda tidak memiliki akses");
    expect(api("a@pegadaian.co.id", { peran })("khususAdmin", {})).toBe("ok-admin");
  });

  it("sesi berakhir → semua rute ditolak dengan kode sesi_berakhir, kecuali mulai", () => {
    const a = api("k@pegadaian.co.id", { peran: { "k@pegadaian.co.id": "karyawan" }, sesi: false });
    expect(galat(() => a("milikKaryawan", {})).kode).toBe("sesi_berakhir");
    expect(a("mulai", {})).toEqual({ email: "k@pegadaian.co.id" });
  });

  it("melewati batas jumlah panggilan → ditolak dengan kode terlalu_sering (AUTH-07)", () => {
    expect(galat(() => api("k@pegadaian.co.id", { batas: false })("mulai", {})).kode).toBe("terlalu_sering");
  });

  it("huruf besar dan spasi di email tidak membuka celah", () => {
    expect(api("  Rina@Pegadaian.co.id ")("mulai", {})).toEqual({ email: "rina@pegadaian.co.id" });
  });
});

/** Cache tiruan dengan masa berlaku, memakai jam yang bisa dimajukan. */
function cacheTiruan() {
  let kini = 1_000_000;
  const isi = new Map<string, { nilai: string; sampai: number }>();
  const cache: Cache = {
    get: (k) => {
      const v = isi.get(k);
      return v && v.sampai > kini ? v.nilai : null;
    },
    put: (k, nilai, detik) => void isi.set(k, { nilai, sampai: kini + detik * 1000 }),
    remove: (k) => void isi.delete(k),
  };
  return { cache, jam: () => kini, maju: (ms: number) => (kini += ms) };
}

describe("Sesi HCS (AUTH-05, AUTH-06)", () => {
  it("aktif setelah mulai; diperpanjang setiap panggilan", () => {
    const t = cacheTiruan();
    const s = buatSesi(t.cache, t.jam);
    expect(s.aktif("a@pegadaian.co.id")).toBe(false);
    s.mulai("a@pegadaian.co.id");
    for (let i = 0; i < 5; i++) {
      t.maju(10 * 60 * 1000); // 10 menit, lalu ada panggilan
      expect(s.aktif("a@pegadaian.co.id")).toBe(true);
    }
  });

  it("berakhir setelah 15 menit diam", () => {
    const t = cacheTiruan();
    const s = buatSesi(t.cache, t.jam);
    s.mulai("a@pegadaian.co.id");
    t.maju(DIAM_DETIK * 1000 + 1);
    expect(s.aktif("a@pegadaian.co.id")).toBe(false);
  });

  it("berakhir setelah 12 jam walaupun terus aktif", () => {
    const t = cacheTiruan();
    const s = buatSesi(t.cache, t.jam);
    s.mulai("a@pegadaian.co.id");
    for (let jalan = 0; jalan < MAKS_MS; jalan += 10 * 60 * 1000) {
      t.maju(10 * 60 * 1000);
      s.aktif("a@pegadaian.co.id");
    }
    t.maju(60_000);
    expect(s.aktif("a@pegadaian.co.id")).toBe(false);
  });

  it("keluar menghapus sesi di server", () => {
    const t = cacheTiruan();
    const s = buatSesi(t.cache, t.jam);
    s.mulai("a@pegadaian.co.id");
    s.akhiri("a@pegadaian.co.id");
    expect(s.aktif("a@pegadaian.co.id")).toBe(false);
  });

  it("sesi satu orang tidak berlaku untuk orang lain", () => {
    const t = cacheTiruan();
    const s = buatSesi(t.cache, t.jam);
    s.mulai("a@pegadaian.co.id");
    expect(s.aktif("b@pegadaian.co.id")).toBe(false);
  });
});

describe("Pembatas jumlah panggilan (AUTH-07, RATE-01)", () => {
  it("menolak setelah batas per menit, pulih di menit berikutnya, terpisah per email", () => {
    const t = cacheTiruan();
    const boleh = buatPembatas(t.cache, t.jam, 3);
    expect([1, 2, 3, 4].map(() => boleh("a@pegadaian.co.id"))).toEqual([true, true, true, false]);
    expect(boleh("b@pegadaian.co.id")).toBe(true);
    t.maju(60_000);
    expect(boleh("a@pegadaian.co.id")).toBe(true);
  });
});

describe("Peran dan profil (AUTH-03)", () => {
  const pengguna = [
    { email: "admin@pegadaian.co.id", peran: "admin", aktif: "ya" },
    { email: "mati@pegadaian.co.id", peran: "admin", aktif: "tidak" },
    { email: "keluar@pegadaian.co.id", peran: "karyawan", aktif: "tidak" },
  ] as Baris<"pengguna">[];
  const karyawan = [
    { prim_email: "Rina@Pegadaian.co.id", aktif: "ya", nama: "Rina Puspitasari", nik_pendek: "P91234", position_name: "Analis SDM", nama_unit_kerja: "Kanwil IV" },
    { prim_email: "lama@pegadaian.co.id", aktif: "tidak", nama: "Pensiun" },
    { prim_email: "keluar@pegadaian.co.id", aktif: "ya", nama: "Dinonaktifkan" },
  ] as Baris<"karyawan">[];

  it("Admin aktif → admin; Admin nonaktif → ditolak", () => {
    expect(peranDari("admin@pegadaian.co.id", pengguna, karyawan)).toBe("admin");
    expect(peranDari("mati@pegadaian.co.id", pengguna, karyawan)).toBeNull();
  });

  it("karyawan aktif di data master → karyawan; nonaktif atau tidak ada → ditolak", () => {
    expect(peranDari("rina@pegadaian.co.id", pengguna, karyawan)).toBe("karyawan");
    expect(peranDari("lama@pegadaian.co.id", pengguna, karyawan)).toBeNull();
    expect(peranDari("asing@pegadaian.co.id", pengguna, karyawan)).toBeNull();
  });

  it("pengguna yang dinonaktifkan tetap ditolak walau masih ada di data master", () => {
    expect(peranDari("keluar@pegadaian.co.id", pengguna, karyawan)).toBeNull();
  });

  it("profil hanya berisi kolom yang dibutuhkan layar", () => {
    expect(profilDari("rina@pegadaian.co.id", "karyawan", karyawan)).toEqual({
      email: "rina@pegadaian.co.id", peran: "karyawan", nama: "Rina Puspitasari", nik: "P91234", jabatan: "Analis SDM", unitKerja: "Kanwil IV",
    });
    expect(profilDari("admin@pegadaian.co.id", "admin", karyawan).nama).toBe("admin");
  });
});
