import { describe, expect, it } from "vitest";
import { keBaris, keObjek, netralkan, pecah } from "../src/data";
import { TABEL } from "../src/skema";

describe("Penetralan rumus (INPUT-02)", () => {
  it.each(["=IMPORTXML(\"http://x\",\"//a\")", "+1+1", "-2+3", "@SUM(A1)", "\t=1", "\r=1"])("isian %j disimpan sebagai teks", (isian) => {
    expect(netralkan(isian)).toBe("'" + isian);
  });

  it("isian biasa tidak diubah", () => {
    expect(netralkan("ST/0412/KW-IV/2026")).toBe("ST/0412/KW-IV/2026");
    expect(netralkan("Rp1.250.000")).toBe("Rp1.250.000");
    expect(netralkan(null)).toBe("");
    expect(netralkan(15)).toBe("15");
  });
});

describe("Konversi baris ↔ objek", () => {
  it("urutan kolom mengikuti skema; kolom tak dikenal dibuang", () => {
    const baris = keBaris("pengguna", { peran: "admin", email: "a@pegadaian.co.id", palsu: "x" } as never);
    expect(baris).toEqual(["a@pegadaian.co.id", "admin", "", "", ""]);
    expect(keObjek("pengguna", baris)).toEqual({ email: "a@pegadaian.co.id", peran: "admin", aktif: "", dibuat_pada: "", diperbarui_pada: "" });
  });

  it("isian berbahaya di objek ikut dinetralkan", () => {
    expect(keBaris("pengguna", { email: "=HYPERLINK(\"x\")" })[0]).toBe("'=HYPERLINK(\"x\")");
  });
});

describe("Skema (PRD 7.1)", () => {
  it("memuat semua tabel PRD 7.1 dan log kinerja", () => {
    expect(Object.keys(TABEL).sort()).toEqual(
      [
        "antrean_email", "dokumen", "jenis_layanan", "karyawan", "log_akses_rekening", "log_kinerja", "log_perubahan",
        "notifikasi", "pengajuan", "pengajuan_tad", "pengguna", "riwayat_sinkronisasi", "riwayat_status", "tad", "tarif_sppd",
      ].sort(),
    );
  });

  it("nama kolom unik per tabel; karyawan hanya 12 kolom HCMS + 3 kolom sistem (DATA-05)", () => {
    for (const def of Object.values(TABEL)) expect(new Set(def.kolom).size).toBe(def.kolom.length);
    expect(TABEL.karyawan.kolom).toHaveLength(15);
  });

  it("tabel log tidak pernah di-cache", () => {
    for (const [nama, def] of Object.entries(TABEL)) if (def.spreadsheet === "Log") expect(def.cache, nama).toBe(false);
  });

  it("nomor rekening hanya ada di kolom _terenkripsi / _terkunci (jumlah_rekening = hitungan log)", () => {
    const kolomRekening = Object.values(TABEL).flatMap((d) => d.kolom.filter((k) => k.includes("rekening")));
    expect(kolomRekening.sort()).toEqual(["jumlah_rekening", "rekening_terenkripsi", "rekening_terkunci", "status_rekening"]);
  });
});

describe("Potongan cache", () => {
  it("menyambung kembali menjadi teks semula", () => {
    const teks = "x".repeat(250_001);
    const p = pecah(teks, 90_000);
    expect(p).toHaveLength(3);
    expect(p.join("")).toBe(teks);
  });
});
