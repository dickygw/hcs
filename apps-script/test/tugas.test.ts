import { beforeEach, describe, expect, it } from "vitest";
import { buatApi, type Pemanggil } from "../src/akses";
import * as P from "../src/pengajuan";
import { RUTE } from "../src/rute";
import * as T from "../src/tugas";
import { b64, dariB64, gudangUji, ISIAN, PDF } from "./gudang-uji";

const A: Pemanggil = { email: "a@pegadaian.co.id", peran: "karyawan" };
const ADMIN1: Pemanggil = { email: "admin1@pegadaian.co.id", peran: "admin" };
const ADMIN2: Pemanggil = { email: "admin2@pegadaian.co.id", peran: "admin" };
const samar = (s: string) => "••••" + s.slice(-4);

let u: ReturnType<typeof gudangUji>;
beforeEach(() => {
  u = gudangUji();
  u.g.tambah("jenis_layanan", [
    { kode: "klaim_perdin", nama: "Klaim Biaya Perdin", awalan_nomor: "KP", aktif: "ya" },
    { kode: "permohonan_sppd", nama: "Permohonan SPPD", awalan_nomor: "SP", aktif: "ya" },
  ]);
  u.g.tambah("karyawan", [{ nik_pendek: "P1", nama: "Rina A", prim_email: A.email, kode_job_grade: "12", aktif: "ya" }]);
  u.g.tambah("tad", [
    { id: "t1", nik: "6471000000000001", nama: "Yusuf Hidayat", nama_bank: "BRI", rekening_terenkripsi: "v1:SANDI012345678901234", vendor: "EPS", terverifikasi: "ya", aktif: "ya" },
    { id: "t2", nik: "6471000000000002", nama: "Andi Saputra", vendor: "PKSS", terverifikasi: "ya", aktif: "ya" },
  ]);
});

/** Permohonan SPPD terkirim: hanya Surat Tugas yang wajib (tanpa langkah Bukti). */
function sppdTerkirim(tad: unknown[] = []) {
  const { nomor } = P.simpanDraf(u.g, A, { jenis: "permohonan_sppd", isian: ISIAN, tad });
  P.unggahDokumen(u.g, A, { nomor, jenis: "surat_tugas", nama: "st.pdf", data: b64(PDF) }, dariB64);
  P.kirimPengajuan(u.g, A, { nomor, pernyataanTad: tad.length > 0 });
  return nomor;
}

describe("Permohonan SPPD (Tahap 7)", () => {
  it("nomor SP-xxxx, tanpa kuitansi dan formulir, otomatis masuk Tugasku", () => {
    expect(P.dokumenWajib(ISIAN, "permohonan_sppd")).toEqual(["surat_tugas"]);
    const nomor = sppdTerkirim();
    expect(nomor).toBe("SP-0001");
    const t = T.tugasku(u.g, {});
    expect(t.hitung).toEqual({ karyawan: 1, tad: 0 });
    expect(t.baris[0]).toMatchObject({ nomor, nama: "Rina A", jenis: "Permohonan SPPD", status: "dikirim", penanda: [] });
  });

  it("draf tidak masuk Tugasku", () => {
    P.simpanDraf(u.g, A, { jenis: "permohonan_sppd", isian: ISIAN });
    expect(T.tugasku(u.g, {}).total).toBe(0);
  });
});

describe("Tugasku (A2)", () => {
  it("tab TAD: satu baris per TAD, dengan penanda rekening kosong dan TAD belum terdaftar", () => {
    sppdTerkirim([{ id: "t1" }, { id: "t2" }, { baru: { nama: "Siti Baru" } }]);
    const t = T.tugasku(u.g, { tab: "tad" });
    expect(t.hitung).toEqual({ karyawan: 1, tad: 3 });
    expect(t.baris.map((b) => [b.nama, b.penanda])).toEqual([
      ["Yusuf Hidayat", []],
      ["Andi Saputra", ["Rekening TAD kosong"]],
      ["Siti Baru", ["TAD belum terdaftar", "Rekening TAD kosong"]],
    ]);
    expect(T.tugasku(u.g, {}).baris[0]!.penanda).toEqual(["TAD belum terdaftar", "Rekening TAD kosong"]);
    expect(JSON.stringify(t)).not.toMatch(/SANDI|012345678901234/);
  });

  it("filter status, jenis, cari, dan per halaman", () => {
    for (let i = 0; i < 25; i++) sppdTerkirim();
    T.ubahStatus(u.g, ADMIN1, { nomor: "SP-0001", aksi: "proses", dari: "dikirim" });
    expect(T.tugasku(u.g, {}).baris).toHaveLength(20);
    expect(T.tugasku(u.g, { halaman: 1 }).baris).toHaveLength(5);
    expect(T.tugasku(u.g, { status: "diproses" }).total).toBe(1);
    expect(T.tugasku(u.g, { jenis: "klaim_perdin" }).total).toBe(0);
    expect(T.tugasku(u.g, { cari: "sp-0012" }).baris.map((b) => b.nomor)).toEqual(["SP-0012"]);
    expect(T.tugasku(u.g, { rentang: "7_hari" }, new Date("2027-01-01")).total).toBe(0);
  });

  it("detail Admin: rekening tersamar, data pemohon terkunci", () => {
    const nomor = sppdTerkirim([{ id: "t1" }]);
    const d = T.bukaPengajuanAdmin(u.g, { nomor }, samar);
    expect(d.tad[0]).toMatchObject({ nama: "Yusuf Hidayat", rekening: "••••1234", nik: "6471xxxx0001" });
    expect(d.pemohon).toMatchObject({ nama: "Rina A", jg: "12", golongan: "B" });
    expect(d.aksi).toEqual(["proses", "revisi", "tolak"]);
    expect(JSON.stringify(d)).not.toContain("012345678901234");
    expect(T.unduhDokumenAdmin(u.g, { id: d.dokumen[0]!.id }).data).toBe(b64(PDF));
  });

  it("draf karyawan tidak dapat dibuka Admin", () => {
    const { nomor } = P.simpanDraf(u.g, A, { jenis: "permohonan_sppd", isian: ISIAN });
    expect(() => T.bukaPengajuanAdmin(u.g, { nomor }, samar)).toThrow("tidak ditemukan");
  });
});

describe("Ubah status (PRD 5.2)", () => {
  it("Proses → Minta revisi → karyawan kirim ulang → Proses → Tolak; tercatat di riwayat", () => {
    const nomor = sppdTerkirim();
    T.ubahStatus(u.g, ADMIN1, { nomor, aksi: "proses", dari: "dikirim" });
    T.ubahStatus(u.g, ADMIN1, { nomor, aksi: "revisi", dari: "diproses", catatan: "Surat Tugas buram, unggah ulang." });
    const k4 = P.bukaPengajuan(u.g, A, { nomor });
    expect(k4).toMatchObject({ status: "perlu_revisi", bisaEdit: true });
    expect(k4.riwayat.at(-1)).toMatchObject({ status: "perlu_revisi", catatan: "Surat Tugas buram, unggah ulang.", oleh: "admin1" });
    expect(P.pengajuanSaya(u.g, A)[0]!.catatan).toBe("Surat Tugas buram, unggah ulang.");
    P.kirimPengajuan(u.g, A, { nomor });
    T.ubahStatus(u.g, ADMIN2, { nomor, aksi: "tolak", dari: "dikirim", catatan: "Sudah diajukan di SP-0000." });
    expect(u.db.riwayat_status.map((r) => r.status_ke)).toEqual(["dikirim", "diproses", "perlu_revisi", "dikirim", "ditolak"]);
    expect(T.tugasku(u.g, {}).total).toBe(0);
  });

  it("Minta revisi dan Tolak tanpa catatan ditolak server", () => {
    const nomor = sppdTerkirim();
    expect(() => T.ubahStatus(u.g, ADMIN1, { nomor, aksi: "revisi", dari: "dikirim", catatan: " " })).toThrow("Tulis catatan revisi");
    expect(() => T.ubahStatus(u.g, ADMIN1, { nomor, aksi: "tolak", dari: "dikirim" })).toThrow("Tulis alasan penolakan");
    expect(u.db.pengajuan[0]!.status).toBe("dikirim");
  });

  it("dua Admin bersamaan: yang kedua ditolak, tidak menimpa", () => {
    const nomor = sppdTerkirim();
    // Keduanya membuka layar saat status "dikirim".
    T.ubahStatus(u.g, ADMIN1, { nomor, aksi: "proses", dari: "dikirim" });
    expect(() => T.ubahStatus(u.g, ADMIN2, { nomor, aksi: "tolak", dari: "dikirim", catatan: "Alasan lengkap." })).toThrow("sudah diubah oleh Admin lain");
    expect(u.db.pengajuan[0]!.status).toBe("diproses");
    expect(u.db.riwayat_status.filter((r) => r.status_ke === "ditolak")).toHaveLength(0);
  });

  it("aksi tidak sah: tidak dikenal, status tidak cocok, draf", () => {
    const nomor = sppdTerkirim();
    expect(() => T.ubahStatus(u.g, ADMIN1, { nomor, aksi: "selesai", dari: "dikirim" })).toThrow("Aksi tidak dikenal");
    expect(() => T.ubahStatus(u.g, ADMIN1, { nomor, aksi: "__proto__", dari: "dikirim" })).toThrow("Aksi tidak dikenal");
    T.ubahStatus(u.g, ADMIN1, { nomor, aksi: "proses", dari: "dikirim" });
    expect(() => T.ubahStatus(u.g, ADMIN1, { nomor, aksi: "proses", dari: "diproses" })).toThrow("tidak dapat dilakukan");
    const { nomor: draf } = P.simpanDraf(u.g, A, { jenis: "permohonan_sppd", isian: ISIAN });
    expect(() => T.ubahStatus(u.g, ADMIN1, { nomor: draf, aksi: "proses", dari: "draf" })).toThrow("tidak ditemukan");
  });

  it("Karyawan tidak dapat memanggil fungsi Admin (mengubah status)", () => {
    const api = buatApi({ email: () => A.email, rute: RUTE, peranDari: () => "karyawan", sesiAktif: () => true, dalamBatas: () => true });
    for (const nama of ["tugasku", "bukaPengajuanAdmin", "unduhDokumenAdmin", "ubahStatus"]) {
      expect(RUTE[nama]!.peran, nama).toEqual(["admin"]);
      expect(() => api(nama, { nomor: "SP-0001", aksi: "proses", dari: "dikirim" }), nama).toThrow("Anda tidak memiliki akses");
    }
  });
});
