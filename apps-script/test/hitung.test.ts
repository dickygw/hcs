import { describe, expect, it } from "vitest";
import { buatDataDummy } from "../src/dummy";
import { hitungOrang, jumlahHari, periksaAlasan, rincianTampil, tarifBerlaku, usulan, type Perjalanan } from "../src/hitung";
import type { Baris } from "../src/skema";

// Tarif SE 145 (PRD 5.5) dari data dummy, berlaku mulai 2026-01-01.
const TARIF = buatDataDummy({ kini: "", acak: Math.random, idBaru: () => "", enkripsi: (t) => t }).tarif_sppd as Baris<"tarif_sppd">[];
const t = tarifBerlaku(TARIF, "2026-09-24");
const menginap = (b: string, k: string, isi: Partial<Perjalanan> = {}): Perjalanan => ({
  tgl_berangkat: b, tgl_kembali: k, menginap: "ya", jarak: "", moda_transportasi: "darat", kendaraan_dinas: "tidak", ...isi,
});
const sehari = (isi: Partial<Perjalanan> = {}): Perjalanan => ({
  tgl_berangkat: "2026-09-02", tgl_kembali: "2026-09-02", menginap: "tidak", jarak: "30_60", moda_transportasi: "darat", kendaraan_dinas: "ya", ...isi,
});

describe("Contoh dari Daftar Pembayaran SPPD Lumpsum (angka saja, tanpa data pribadi)", () => {
  it("Gol. B menginap 24–26 Sep: 410.000 × 1 + 410.000 × 2 = 1.230.000", () => {
    const h = hitungOrang(menginap("2026-09-24", "2026-09-26"), "B", t);
    expect([h.tarifAsal, h.qtyAsal, h.tarifTujuan, h.qtyTujuan, h.uangHarian, h.total]).toEqual([410_000, 1, 410_000, 2, 1_230_000, 1_230_000]);
  });

  it("Gol. C menginap 3 hari: 900.000; TAD 3 hari: 630.000 (70% Gol. C)", () => {
    expect(hitungOrang(menginap("2026-09-24", "2026-09-26"), "C", t).total).toBe(900_000);
    expect(hitungOrang(menginap("2026-09-24", "2026-09-26"), "TAD", t).total).toBe(630_000);
  });

  it("Gol. B menginap 05–06 Okt: 820.000; TAD 2 hari: 420.000", () => {
    expect(hitungOrang(menginap("2026-10-05", "2026-10-06"), "B", t).total).toBe(820_000);
    expect(hitungOrang(menginap("2026-10-05", "2026-10-06"), "TAD", t).total).toBe(420_000);
  });

  it("Gol. B tidak menginap >30–60 km dengan kendaraan dinas: 50% × 250.000 = 125.000, transportasi tidak dibayar", () => {
    const h = hitungOrang(sehari(), "B", t, { jalan: 4 });
    expect([h.tarifAsal, h.qtyAsal, h.qtyTujuan, h.jalan, h.total]).toEqual([125_000, 1, 0, 0, 125_000]);
  });

  it("Gol. B 11–12 Sep pesawat: transportasi bandara 4 × 250.000; jumlah hari diubah Admin menjadi 3 dengan alasan → 2.230.000", () => {
    const p = menginap("2026-09-11", "2026-09-12", { moda_transportasi: "pesawat" });
    const awal = hitungOrang(p, "B", t);
    expect([awal.jalan, awal.transport, awal.total]).toEqual([4, 1_000_000, 1_820_000]);
    const ubah = hitungOrang(p, "B", t, { qtyTujuan: 2 });
    expect(ubah.diubah).toBe(true);
    expect(() => periksaAlasan("Karyawan", ubah)).toThrow("Tulis alasan perubahan perhitungan untuk Karyawan.");
    const beralasan = hitungOrang(p, "B", t, { qtyTujuan: 2, alasan: "Kembali tanggal 13 karena jadwal pesawat." });
    expect(() => periksaAlasan("Karyawan", beralasan)).not.toThrow();
    expect(beralasan.total).toBe(2_230_000);
  });
});

describe("Aturan PRD 5.5", () => {
  it("jumlah hari kalender termasuk hari berangkat dan kembali", () => {
    expect([jumlahHari(menginap("2026-09-30", "2026-10-02")), jumlahHari(sehari()), jumlahHari(menginap("", ""))]).toEqual([3, 1, 0]);
  });

  it("uang harian menginap per golongan; kendaraan dinas tetap 100%", () => {
    const p = menginap("2026-09-24", "2026-09-24");
    expect((["A", "B", "C", "TAD"] as const).map((g) => hitungOrang(p, g, t).uangHarian)).toEqual([520_000, 410_000, 300_000, 210_000]);
    expect(hitungOrang({ ...p, kendaraan_dinas: "ya" }, "A", t).uangHarian).toBe(520_000);
  });

  it("tidak menginap >60 km; tanpa kendaraan dinas 100% dan transportasi bandara 2 kali jalan bila pesawat/kapal", () => {
    const p = sehari({ jarak: "60", kendaraan_dinas: "tidak", moda_transportasi: "kapal" });
    const h = hitungOrang(p, "A", t);
    expect([h.uangHarian, h.jalan, h.transport]).toEqual([380_000, 2, 500_000]);
    expect(hitungOrang(p, "TAD", t).uangHarian).toBe(140_000);
    expect(hitungOrang(sehari({ kendaraan_dinas: "tidak" }), "C", t).uangHarian).toBe(180_000);
  });

  it("tarif transportasi TAD 175.000 per jalan", () => {
    expect(hitungOrang(menginap("2026-09-24", "2026-09-26", { moda_transportasi: "pesawat" }), "TAD", t).transport).toBe(700_000);
  });

  it("bantuan sewa rumah untuk menginap > 12 hari, bukan TAD", () => {
    expect(usulan(menginap("2026-09-01", "2026-09-12"), "B").sewaBulan).toBe(0);
    const h = hitungOrang(menginap("2026-09-01", "2026-09-13"), "B", t);
    expect([h.sewaBulan, h.sewa]).toEqual([1, 2_200_000]);
    expect(hitungOrang(menginap("2026-09-01", "2026-10-15"), "A", t).sewa).toBe(2 * 3_300_000);
    expect(hitungOrang(menginap("2026-09-01", "2026-09-30"), "TAD", t, { sewaBulan: 3 }).sewa).toBe(0);
  });

  it("hotel dan tiket at cost; penyesuaian wajib beralasan; total tidak negatif", () => {
    const p = menginap("2026-09-24", "2026-09-26", { moda_transportasi: "pesawat" });
    const h = hitungOrang(p, "B", t, { hotel: 1_350_000, tiket: 2_180_000 });
    expect(h.diubah).toBe(false);
    expect(h.total).toBe(1_230_000 + 1_000_000 + 1_350_000 + 2_180_000);
    expect(hitungOrang(p, "B", t, { penyesuaian: -100_000 }).diubah).toBe(true);
    expect(() => hitungOrang(p, "B", t, { penyesuaian: -99_000_000 })).toThrow("tidak boleh kurang dari nol");
    expect(() => hitungOrang(p, "B", t, { qtyAsal: 999 })).toThrow("di luar batas");
    expect(() => hitungOrang(p, "B", t, { hotel: "abc" as never })).toThrow("di luar batas");
  });

  it("tarif dipilih menurut tanggal berlaku; tarif belum ada → pesan jelas", () => {
    const baru = [...TARIF, { golongan: "B", komponen: "harian_menginap", nominal: "450000", berlaku_mulai: "2027-01-01", berlaku_sampai: "", dibuat_pada: "" }];
    expect(tarifBerlaku(baru, "2026-12-31")("B", "harian_menginap")).toBe(410_000);
    expect(tarifBerlaku(baru, "2027-02-01")("B", "harian_menginap")).toBe(450_000);
    expect(() => tarifBerlaku(TARIF, "2025-06-01")("B", "harian_menginap")).toThrow("belum ada di Tarif SPPD");
  });

  it("rincian untuk karyawan tanpa tarif: hanya nama komponen dan nominal", () => {
    const h = hitungOrang(menginap("2026-09-24", "2026-09-26", { moda_transportasi: "pesawat" }), "B", t, { hotel: 500_000 });
    expect(rincianTampil(h)).toEqual([
      { label: "Uang harian (3 hari)", nominal: 1_230_000 },
      { label: "Transportasi bandara/terminal", nominal: 1_000_000 },
      { label: "Hotel", nominal: 500_000 },
    ]);
    expect(JSON.stringify(rincianTampil(h))).not.toMatch(/410000|250000|tarif/i);
  });
});
