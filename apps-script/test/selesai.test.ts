import { beforeEach, describe, expect, it } from "vitest";
import { buatApi, type Pemanggil } from "../src/akses";
import { buatDataDummy } from "../src/dummy";
import * as P from "../src/pengajuan";
import { RUTE } from "../src/rute";
import * as T from "../src/tugas";
import { b64, dariB64, gudangUji, ISIAN, PDF } from "./gudang-uji";

const A: Pemanggil = { email: "a@pegadaian.co.id", peran: "karyawan" };
const ADMIN: Pemanggil = { email: "admin@pegadaian.co.id", peran: "admin" };
const REK = "012345678901234";
const kunci = (t: string) => "v1:" + Buffer.from(t).toString("base64");
const buka = (s: string) => Buffer.from(s.slice(3), "base64").toString();

let u: ReturnType<typeof gudangUji>;
beforeEach(() => {
  u = gudangUji();
  const dummy = buatDataDummy({ kini: "", acak: Math.random, idBaru: () => "", enkripsi: (t) => t });
  u.g.tambah("tarif_sppd", dummy.tarif_sppd);
  u.g.tambah("jenis_layanan", dummy.jenis_layanan);
  u.g.tambah("karyawan", [{ nik_pendek: "P1", nama: "Rina A", prim_email: A.email, kode_job_grade: "12", nama_unit_kerja: "Kantor Area Samarinda", aktif: "ya" }]);
  u.g.tambah("tad", [
    { id: "t1", nik: "6471000000000001", nama: "Yusuf Hidayat", nama_bank: "BRI", rekening_terenkripsi: kunci(REK), vendor: "EPS", terverifikasi: "ya", aktif: "ya" },
    { id: "t2", nik: "6471000000000002", nama: "Andi Saputra", vendor: "PKSS", terverifikasi: "ya", aktif: "ya" },
  ]);
});

/** Klaim Perdin Gol. B, 24–26 Sep menginap, pesawat, dengan TAD; sudah Diproses. */
function klaimDiproses(tad: unknown[] = [{ id: "t1" }], isian: Record<string, string> = {}) {
  const { nomor } = P.simpanDraf(u.g, A, { jenis: "klaim_perdin", isian: { ...ISIAN, tgl_berangkat: "2026-09-24", tgl_kembali: "2026-09-26", ...isian }, tad });
  for (const jenis of ["surat_tugas", "kuitansi_hotel", "kuitansi_transportasi", "formulir"]) P.unggahDokumen(u.g, A, { nomor, jenis, data: b64(PDF) }, dariB64);
  P.kirimPengajuan(u.g, A, { nomor, pernyataanTad: tad.length > 0 });
  T.ubahStatus(u.g, ADMIN, { nomor, aksi: "proses", dari: "dikirim" });
  return nomor;
}

describe("Perhitungan di A3", () => {
  it("panel memuat tarif yang berlaku dan daftar orang (karyawan + TAD)", () => {
    const nomor = klaimDiproses();
    const d = T.bukaPengajuanAdmin(u.g, { nomor }, (s) => "••••" + buka(s).slice(-4));
    expect(d.hitung!.orang.map((o) => [o.kunci, o.gol])).toEqual([["karyawan", "B"], ["t1", "TAD"]]);
    expect(d.hitung!.tarif["B|harian_menginap"]).toBe(410_000);
    expect(d.aksi).toContain("selesai");
  });

  it("nominal dari browser diabaikan; server menghitung ulang (INPUT-03)", () => {
    const nomor = klaimDiproses();
    const palsu = { nomor, dari: "diproses", total: 1, orang: { karyawan: { total: 99_999_999, uangHarian: 1 } as never } };
    T.selesaikan(u.g, ADMIN, palsu);
    const pj = u.db.pengajuan[0]!;
    // Gol. B: 1.230.000 + 4 × 250.000; TAD: 630.000 + 4 × 175.000
    expect(pj.nominal_disetujui).toBe(String(2_230_000 + 1_330_000));
    expect(u.db.pengajuan_tad[0]!.nominal_disetujui).toBe("1330000");
  });

  it("penyesuaian atau perubahan jumlah hari tanpa alasan ditolak; dengan alasan tercatat di log", () => {
    const nomor = klaimDiproses([]);
    expect(() => T.selesaikan(u.g, ADMIN, { nomor, dari: "diproses", orang: { karyawan: { qtyTujuan: 3 } } })).toThrow("Tulis alasan perubahan perhitungan untuk Rina A.");
    T.selesaikan(u.g, ADMIN, { nomor, dari: "diproses", orang: { karyawan: { qtyTujuan: 3, alasan: "Kembali sehari kemudian." } } });
    expect(u.db.log_perubahan.at(-1)).toMatchObject({ jenis_perubahan: "penyesuaian_hitung", alasan: "Kembali sehari kemudian.", kunci_baris: `${nomor}/karyawan` });
  });

  it("simpan perhitungan hanya saat Diproses", () => {
    const nomor = klaimDiproses([]);
    expect(T.simpanHitung(u.g, { nomor, orang: { karyawan: { hotel: 500_000 } } }).total).toBe(2_730_000);
    T.selesaikan(u.g, ADMIN, { nomor, dari: "diproses", orang: { karyawan: { hotel: 500_000 } } });
    expect(() => T.simpanHitung(u.g, { nomor, orang: {} })).toThrow("hanya dapat diubah saat pengajuan Diproses");
  });

  it("golongan kosong (JG 0) wajib dipilih Admin", () => {
    u.db.karyawan[0]!.kode_job_grade = "0";
    const nomor = klaimDiproses([]);
    expect(() => T.selesaikan(u.g, ADMIN, { nomor, dari: "diproses" })).toThrow("Pilih golongan karyawan");
    T.selesaikan(u.g, ADMIN, { nomor, dari: "diproses", golongan: "C" });
    expect(u.db.pengajuan[0]!.nominal_disetujui).toBe(String(900_000 + 1_000_000));
  });
});

describe("Rekening TAD dan Selesai (PRD 5.7)", () => {
  it("Selesai terkunci bila rekening TAD kosong; dilengkapi Admin → terenkripsi, tidak ada di log", () => {
    const nomor = klaimDiproses([{ id: "t2" }]);
    expect(() => T.selesaikan(u.g, ADMIN, { nomor, dari: "diproses" })).toThrow("Lengkapi rekening TAD sebelum menyelesaikan pengajuan.");
    expect(() => T.lengkapiRekeningTad(u.g, ADMIN, { nomor, tadId: "t2", rekening: "12345" }, kunci)).toThrow("15 digit");
    T.lengkapiRekeningTad(u.g, ADMIN, { nomor, tadId: "t2", rekening: "0123-4567-8901-234" }, kunci);
    expect(buka(u.db.pengajuan_tad[0]!.rekening_terkunci!)).toBe(REK);
    expect(u.db.tad[1]).toMatchObject({ nama_bank: "BRI", terverifikasi: "ya" });
    expect(buka(u.db.tad[1]!.rekening_terenkripsi!)).toBe(REK);
    expect(JSON.stringify(u.db.log_perubahan)).not.toContain(REK);
    T.selesaikan(u.g, ADMIN, { nomor, dari: "diproses" });
    expect(u.db.pengajuan[0]!.status).toBe("selesai");
  });

  it("Selesai hanya dari Diproses dan tidak menimpa perubahan Admin lain", () => {
    const { nomor } = P.simpanDraf(u.g, A, { jenis: "klaim_perdin", isian: ISIAN });
    for (const jenis of ["surat_tugas", "kuitansi_hotel", "kuitansi_transportasi", "formulir"]) P.unggahDokumen(u.g, A, { nomor, jenis, data: b64(PDF) }, dariB64);
    P.kirimPengajuan(u.g, A, { nomor });
    expect(() => T.selesaikan(u.g, ADMIN, { nomor, dari: "dikirim" })).toThrow("harus berstatus Diproses");
    T.ubahStatus(u.g, ADMIN, { nomor, aksi: "proses", dari: "dikirim" });
    expect(() => T.selesaikan(u.g, ADMIN, { nomor, dari: "dikirim" })).toThrow("sudah diubah oleh Admin lain");
  });

  it("Pemesanan Tiket selesai tanpa nominal", () => {
    const { nomor } = P.simpanDraf(u.g, A, {
      jenis: "pemesanan_tiket",
      isian: { no_surat_tugas: "ST/1/2026", kegiatan: "Rapat", kota_asal: "Balikpapan", kota_tujuan: "Tarakan", tgl_berangkat: "2026-10-14", waktu_berangkat: "08:00" },
    });
    P.unggahDokumen(u.g, A, { nomor, jenis: "surat_tugas", data: b64(PDF) }, dariB64);
    P.kirimPengajuan(u.g, A, { nomor });
    T.ubahStatus(u.g, ADMIN, { nomor, aksi: "proses", dari: "dikirim" });
    expect(T.bukaPengajuanAdmin(u.g, { nomor }, () => "").hitung).toBeNull();
    T.selesaikan(u.g, ADMIN, { nomor, dari: "diproses" });
    expect(u.db.pengajuan[0]).toMatchObject({ status: "selesai", nominal_disetujui: "" });
  });
});

describe("Karyawan: angka hanya setelah Selesai, tanpa tarif (PRD 5.8, AKSES-05)", () => {
  it("sebelum Selesai tidak ada angka; sesudah Selesai rincian tanpa tarif atau rumus", () => {
    const nomor = klaimDiproses();
    T.simpanHitung(u.g, { nomor, orang: { karyawan: { hotel: 1_350_000 } } });
    const sebelum = JSON.stringify([P.bukaPengajuan(u.g, A, { nomor }), P.pengajuanSaya(u.g, A)]);
    expect(sebelum).not.toMatch(/1230000|1350000|410000|rincian_hitung|"nominal":"\d/);
    T.selesaikan(u.g, ADMIN, { nomor, dari: "diproses", orang: { karyawan: { hotel: 1_350_000 } } });
    const d = P.bukaPengajuan(u.g, A, { nomor });
    expect(d.rincian).toEqual([
      { label: "Uang harian (3 hari)", nominal: 1_230_000 },
      { label: "Transportasi bandara/terminal", nominal: 1_000_000 },
      { label: "Hotel", nominal: 1_350_000 },
    ]);
    expect(d.nominal).toBe(String(3_580_000 + 1_330_000));
    expect(d.tad[0]!.rincian[0]).toEqual({ label: "Uang harian (3 hari)", nominal: 630_000 });
    expect(JSON.stringify(d)).not.toMatch(/410000|250000|175000|210000|tarif|qty|rincian_hitung|REK|012345678901234/);
  });
});

describe("Ekspor Daftar Pembayaran SPPD Lumpsum (CMS)", () => {
  it("kolom sesuai daftar pembayaran; karyawan tanpa rekening (cocok lewat NIK); rekening TAD lengkap tercatat di log", () => {
    const nomor = klaimDiproses();
    T.selesaikan(u.g, ADMIN, { nomor, dari: "diproses" });
    const hari = new Date(Date.parse(u.db.pengajuan[0]!.disetujui_pada!) + 8 * 3_600_000).toISOString().slice(0, 10);
    const e = T.eksporPembayaran(u.g, ADMIN, { dari: hari, sampai: hari }, buka);
    expect(e.kolom.slice(0, 14)).toEqual(["No", "NIK", "Nama", "Grade", "Kegiatan", "Tanggal", "Unit Asal", "Unit Tujuan", "Uang Harian Unit Kerja Asal", "Quantity", "Uang Harian Kota Tujuan", "Quantity2", "Jumlah Uang Harian", "Transportasi"]);
    expect(e.baris[0]).toEqual(["1", "P1", "Rina A", "12", "Waskat CP Melak", "24-26 September 2026", "Kantor Area Samarinda", "Samarinda", "410000", "1", "410000", "2", "1230000", "1000000", "", "", "", "2230000", "", "", nomor]);
    expect(e.baris[1]!.slice(1, 4)).toEqual(["6471000000000001", "Yusuf Hidayat", "TAD"]);
    expect(e.baris[1]!.slice(-3)).toEqual(["BRI", REK, `${nomor} (TAD)`]);
    expect(u.db.log_akses_rekening.at(-1)).toMatchObject({ pengguna_email: ADMIN.email, jenis: "ekspor_pembayaran", nomor_pengajuan: nomor, jumlah_rekening: "1" });
  });

  it("hanya pengajuan Selesai pada rentang tanggal; isian berawalan = dinetralkan (INPUT-04)", () => {
    const nomor = klaimDiproses([], { kegiatan: "=HYPERLINK(\"http://x\")" });
    expect(() => T.eksporPembayaran(u.g, ADMIN, { dari: "2020-01-01", sampai: "2100-01-01" }, buka)).toThrow("Tidak ada pengajuan Selesai");
    T.selesaikan(u.g, ADMIN, { nomor, dari: "diproses" });
    expect(T.eksporPembayaran(u.g, ADMIN, { dari: "2020-01-01", sampai: "2100-01-01" }, buka).baris[0]![4]).toBe(`'=HYPERLINK("http://x")`);
    expect(() => T.eksporPembayaran(u.g, ADMIN, { dari: "2026-10-10", sampai: "2026-10-01" }, buka)).toThrow("rentang tanggal");
  });

  it("PDF persetujuan atasan: tanpa bank dan rekening, rekening tidak dibuka, tidak masuk log akses rekening", () => {
    const nomor = klaimDiproses();
    T.selesaikan(u.g, ADMIN, { nomor, dari: "diproses" });
    let dibuka = 0;
    const e = T.eksporPembayaran(u.g, ADMIN, { dari: "2020-01-01", sampai: "2100-01-01", format: "pdf" }, (s) => (dibuka++, buka(s)));
    expect(e.kolom).not.toContain("Nomor Rekening");
    expect(e.kolom).not.toContain("Nama Bank");
    expect(e.baris[1]).toHaveLength(e.kolom.length);
    expect(JSON.stringify(e)).not.toContain(REK);
    expect([dibuka, u.db.log_akses_rekening.length, e.total]).toEqual([0, 0, 2_230_000 + 1_330_000]);
  });

  it("format tanggal daftar", () => {
    expect([T.tanggalDaftar("2026-09-24", "2026-09-26"), T.tanggalDaftar("2026-08-05", "2026-08-05"), T.tanggalDaftar("2026-09-30", "2026-10-02")]).toEqual([
      "24-26 September 2026", "05 Agustus 2026", "30 September-02 Oktober 2026",
    ]);
  });
});

describe("Akses", () => {
  it("Karyawan tidak dapat memanggil fungsi perhitungan, Selesai, rekening, atau ekspor", () => {
    const api = buatApi({ email: () => A.email, rute: RUTE, peranDari: () => "karyawan", sesiAktif: () => true, dalamBatas: () => true });
    for (const nama of ["simpanHitung", "selesaikan", "lengkapiRekeningTad", "eksporPembayaran"]) {
      expect(RUTE[nama]!.peran, nama).toEqual(["admin"]);
      expect(() => api(nama, {}), nama).toThrow("Anda tidak memiliki akses");
    }
  });
});
