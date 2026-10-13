import { beforeEach, describe, expect, it } from "vitest";
import type { Pemanggil } from "../src/akses";
import { KOLOM_0002, MIGRASI } from "../src/migrasi";
import * as P from "../src/pengajuan";
import { TABEL } from "../src/skema";
import * as T from "../src/tugas";
import { b64, dariB64, gudangUji, PDF } from "./gudang-uji";

const A: Pemanggil = { email: "a@pegadaian.co.id", peran: "karyawan" };
const B: Pemanggil = { email: "b@pegadaian.co.id", peran: "karyawan" };
const TIKET = {
  no_surat_tugas: "ST/0455/KW-IV/2026", kota_asal: "Balikpapan", kota_tujuan: "Tarakan",
  tgl_berangkat: "2026-10-14", waktu_berangkat: "pagi", tgl_kembali: "2026-10-16", waktu_kembali: "sore",
  nama_hotel: "Hotel Tarakan Plaza", catatan: "Bila bisa, maskapai Garuda.",
};

let u: ReturnType<typeof gudangUji>;
beforeEach(() => {
  u = gudangUji();
  u.g.tambah("jenis_layanan", [{ kode: "pemesanan_tiket", nama: "Pemesanan Tiket Pesawat", awalan_nomor: "TP", aktif: "ya" }]);
  u.g.tambah("karyawan", [
    { nik_pendek: "P1", nama: "Rina A", prim_email: A.email, kode_job_grade: "12", aktif: "ya" },
    { nik_pendek: "P2", nama: "Budi B", prim_email: B.email, kode_job_grade: "8", aktif: "ya" },
  ]);
});

function tiketTerkirim(isian: Record<string, string> = TIKET) {
  const { nomor } = P.simpanDraf(u.g, A, { jenis: "pemesanan_tiket", isian });
  P.unggahDokumen(u.g, A, { nomor, jenis: "surat_tugas", nama: "st.pdf", data: b64(PDF) }, dariB64);
  P.kirimPengajuan(u.g, A, { nomor });
  return nomor;
}

describe("Pemesanan Tiket Pesawat (Tahap 8)", () => {
  it("nomor TP-xxxx, hanya Surat Tugas wajib, otomatis masuk Tugasku, isian tersimpan", () => {
    const nomor = tiketTerkirim();
    expect(nomor).toBe("TP-0001");
    expect(T.tugasku(u.g, {}).baris[0]).toMatchObject({ nomor, jenis: "Pemesanan Tiket Pesawat", status: "dikirim" });
    expect(P.bukaPengajuan(u.g, A, { nomor }).isian).toMatchObject(TIKET);
  });

  it("validasi: kota asal, kota tujuan, tanggal dan waktu berangkat wajib; menginap dan moda tidak ditanya", () => {
    const g = P.periksaIsian(P.bersihkanIsian({ no_surat_tugas: "ST/1" }), "pemesanan_tiket");
    expect(g).toEqual({
      kota_asal: "Isi kota asal.", kota_tujuan: "Isi kota tujuan.", tgl_berangkat: "Isi tanggal berangkat.", waktu_berangkat: "Pilih waktu berangkat.",
    });
  });

  it("sekali jalan boleh; bila tanggal kembali diisi, waktu kembali wajib dan tidak sebelum berangkat", () => {
    const sekali = { ...TIKET, tgl_kembali: "", waktu_kembali: "sore", nama_hotel: "", catatan: "" };
    expect(P.periksaIsian(P.bersihkanIsian(sekali), "pemesanan_tiket")).toEqual({});
    expect(P.bersihkanIsian(sekali).waktu_kembali).toBe(""); // dibuang bila tanpa tanggal kembali
    expect(P.periksaIsian(P.bersihkanIsian({ ...TIKET, waktu_kembali: "" }), "pemesanan_tiket")).toEqual({ waktu_kembali: "Pilih waktu kembali." });
    expect(P.periksaIsian(P.bersihkanIsian({ ...TIKET, tgl_kembali: "2026-10-01" }), "pemesanan_tiket")).toEqual({ tgl_kembali: "Tanggal kembali sebelum tanggal berangkat." });
    expect(P.bersihkanIsian({ waktu_berangkat: "tengah malam" }).waktu_berangkat).toBe("");
    expect(P.bersihkanIsian({ catatan: "x".repeat(1000) }).catatan).toHaveLength(300);
  });

  it("kepemilikan diulang: Karyawan B tidak dapat membuka atau mengubah tiket milik A", () => {
    const nomor = tiketTerkirim();
    expect(() => P.bukaPengajuan(u.g, B, { nomor })).toThrow(/tidak ditemukan/);
    expect(() => P.batalkanPengajuan(u.g, B, { nomor })).toThrow(/tidak ditemukan/);
    expect(() => P.unduhDokumen(u.g, B, { id: u.db.dokumen[0]!.id })).toThrow(/tidak ditemukan/);
  });

  it("isian berawalan = tersimpan sebagai teks (INPUT-02) melalui modul data", () => {
    P.simpanDraf(u.g, A, { jenis: "pemesanan_tiket", isian: { ...TIKET, catatan: "=HYPERLINK(\"x\")" } });
    expect(u.db.pengajuan[0]!.catatan).toBe('=HYPERLINK("x")'); // gudang uji menyimpan apa adanya; netralisasi di keBaris (data.test.ts)
  });
});

describe("Migrasi 0002 (WS-13)", () => {
  it("kolom baru ditambahkan di akhir skema pengajuan, sama persis dengan migrasi", () => {
    expect(TABEL.pengajuan.kolom.slice(-KOLOM_0002.length)).toEqual(KOLOM_0002);
    expect(TABEL.pengajuan.kolom.slice(0, 3)).toEqual(["nomor", "jenis_layanan", "nik_pendek"]); // urutan lama tidak bergeser
  });

  it("nomor migrasi unik dan berurutan", () => {
    expect(MIGRASI.map((m) => m.nomor)).toEqual(["0001", "0002"]);
  });
});
