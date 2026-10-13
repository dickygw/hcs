import { beforeEach, describe, expect, it } from "vitest";
import { buatApi, GalatPengguna, type Pemanggil } from "../src/akses";
import * as P from "../src/pengajuan";
import { RUTE } from "../src/rute";
import { TABEL, type Baris, type NamaTabel } from "../src/skema";

/** Gudang di memori: tabel = array objek, file = Map. */
function gudangUji() {
  const db = Object.fromEntries(Object.keys(TABEL).map((t) => [t, [] as Record<string, string>[]])) as Record<NamaTabel, Record<string, string>[]>;
  const lengkap = <T extends NamaTabel>(t: T, o: Partial<Baris<T>>) => Object.fromEntries(TABEL[t].kolom.map((k) => [k, String((o as Record<string, unknown>)[k] ?? "")]));
  const file = new Map<string, Uint8Array>();
  const nomor: Record<string, number> = {};
  let n = 0;
  let detik = 0;
  const g: P.Gudang = {
    baca: (t) => db[t].map((x) => ({ ...x })) as never,
    tambah: (t, d) => db[t].push(...d.map((o) => lengkap(t, o))),
    ubah: (t, i, o) => (db[t][i] = lengkap(t, o)),
    gantiSemua: (t, d) => (db[t] = d.map((o) => lengkap(t, o))),
    kunci: (fn) => fn(),
    kini: () => new Date(Date.UTC(2026, 9, 13, 0, 0, detik++)).toISOString(),
    id: () => "id" + n++,
    nomorBerikut: (a) => (nomor[a] = (nomor[a] ?? 0) + 1),
    file: {
      simpan: (_n, nama, _t, isi) => (file.set("drive-" + nama, isi), "drive-" + nama),
      hapus: (id) => void file.delete(id),
      ambil: (id) => Buffer.from(file.get(id)!).toString("base64"),
    },
  };
  return { g, db, file };
}

const A: Pemanggil = { email: "a@pegadaian.co.id", peran: "karyawan" };
const B: Pemanggil = { email: "b@pegadaian.co.id", peran: "karyawan" };
const REKENING = "012345678901234";
const PDF = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const b64 = (b: Uint8Array) => Buffer.from(b).toString("base64");
const dariB64 = (s: string) => new Uint8Array(Buffer.from(s, "base64"));
const ISIAN = {
  no_surat_tugas: "ST/0412/KW-IV/2026", kota_tujuan: "Samarinda", tgl_berangkat: "2026-10-06", tgl_kembali: "2026-10-08",
  menginap: "ya", jarak: "", moda_transportasi: "pesawat", kendaraan_dinas: "tidak",
};

let u: ReturnType<typeof gudangUji>;
beforeEach(() => {
  u = gudangUji();
  u.g.tambah("jenis_layanan", [{ kode: "klaim_perdin", nama: "Klaim Biaya Perdin", awalan_nomor: "KP", aktif: "ya" }]);
  u.g.tambah("karyawan", [
    { nik_pendek: "P1", nama: "Rina A", prim_email: A.email, kode_job_grade: "12", position_name: "Analis", nama_unit_kerja: "Kanwil", aktif: "ya" },
    { nik_pendek: "P2", nama: "Budi B", prim_email: B.email, kode_job_grade: "8", aktif: "ya" },
  ]);
  u.g.tambah("tad", [
    { id: "t1", nik: "6471000000000001", nama: "Yusuf Hidayat", nama_bank: "BRI", rekening_terenkripsi: "v1:SANDI", vendor: "EPS", unit_kerja: "Kanwil", terverifikasi: "ya", aktif: "ya" },
    { id: "t2", nik: "6471000000000002", nama: "Andi Saputra", vendor: "PKSS", terverifikasi: "ya", aktif: "ya" },
  ]);
});

/** Draf lengkap dengan dokumen wajib, siap dikirim. */
function drafLengkap(p: Pemanggil, tad: unknown[] = []) {
  const { nomor } = P.simpanDraf(u.g, p, { jenis: "klaim_perdin", isian: ISIAN, tad });
  for (const jenis of ["surat_tugas", "kuitansi_hotel", "kuitansi_transportasi", "formulir"]) P.unggahDokumen(u.g, p, { nomor, jenis, nama: jenis + ".pdf", data: b64(PDF) }, dariB64);
  return nomor;
}

describe("Draf, nomor, kirim", () => {
  it("nomor dibuat saat draf pertama; data karyawan dikunci saat kirim (PRD 5.6)", () => {
    const nomor = drafLengkap(A, [{ id: "t1" }]);
    expect(nomor).toBe("KP-0001");
    expect(P.pengajuanSaya(u.g, A)[0]).toMatchObject({ nomor, status: "draf" });
    P.kirimPengajuan(u.g, A, { nomor, pernyataanTad: true });
    const pj = u.db.pengajuan[0]!;
    expect(pj).toMatchObject({ status: "dikirim", jg_terkunci: "12", golongan_terkunci: "B", jabatan_terkunci: "Analis", unit_kerja_terkunci: "Kanwil", pernyataan_tad: "ya" });
    expect(u.db.pengajuan_tad[0]).toMatchObject({ tad_id: "t1", rekening_terkunci: "v1:SANDI", status_rekening: "lengkap", no_surat_tugas: ISIAN.no_surat_tugas });
    expect(u.db.riwayat_status.map((r) => r.status_ke)).toEqual(["dikirim"]);
    expect(P.simpanDraf(u.g, A, { jenis: "klaim_perdin", isian: {} }).nomor).toBe("KP-0002");
  });

  it("isian dan dokumen wajib diperiksa saat kirim", () => {
    const { nomor } = P.simpanDraf(u.g, A, { jenis: "klaim_perdin", isian: { ...ISIAN, tgl_kembali: "2026-10-01" } });
    expect(() => P.kirimPengajuan(u.g, A, { nomor })).toThrow("Tanggal kembali sebelum tanggal berangkat.");
    P.simpanDraf(u.g, A, { nomor, isian: ISIAN });
    expect(() => P.kirimPengajuan(u.g, A, { nomor })).toThrow(/Unggah dokumen: Surat Tugas, Formulir pengajuan, Kuitansi hotel, Kuitansi transportasi/);
  });

  it("pernyataan TAD wajib bila ada TAD", () => {
    const nomor = drafLengkap(A, [{ id: "t1" }]);
    expect(() => P.kirimPengajuan(u.g, A, { nomor })).toThrow(/pernyataan/);
  });

  it("isian di luar pilihan dibuang (INPUT-01)", () => {
    expect(P.bersihkanIsian({ menginap: "mungkin", moda_transportasi: "roket", tgl_berangkat: "2026-02-31", jarak: "60", kota_tujuan: "x".repeat(500) })).toMatchObject({
      menginap: "", moda_transportasi: "", tgl_berangkat: "", jarak: "60",
    });
    expect(P.bersihkanIsian({ kota_tujuan: "x".repeat(500) }).kota_tujuan).toHaveLength(100);
  });

  it("layanan yang belum dibangun ditolak", () => {
    expect(() => P.simpanDraf(u.g, A, { jenis: "permohonan_sppd", isian: {} })).toThrow("Jenis layanan tidak tersedia.");
  });

  it("edit dan kirim ulang saat Perlu revisi, nomor tetap", () => {
    const nomor = drafLengkap(A);
    P.kirimPengajuan(u.g, A, { nomor });
    expect(() => P.simpanDraf(u.g, A, { nomor, isian: ISIAN })).toThrow("tidak dapat diubah");
    u.db.pengajuan[0]!.status = "perlu_revisi"; // diubah Admin (Tahap 7)
    P.simpanDraf(u.g, A, { nomor, isian: { ...ISIAN, kota_tujuan: "Tarakan" } });
    P.kirimPengajuan(u.g, A, { nomor });
    expect(u.db.pengajuan[0]).toMatchObject({ nomor, status: "dikirim", kota_tujuan: "Tarakan" });
    expect(u.db.riwayat_status.at(-1)).toMatchObject({ status_dari: "perlu_revisi", status_ke: "dikirim", catatan: "Dikirim ulang" });
  });

  it("batalkan hanya sebelum diproses; TAD dilepas", () => {
    const nomor = drafLengkap(A, [{ id: "t1" }]);
    P.kirimPengajuan(u.g, A, { nomor, pernyataanTad: true });
    P.batalkanPengajuan(u.g, A, { nomor });
    expect(u.db.pengajuan[0]!.status).toBe("dibatalkan");
    expect(P.tadTerpakai(u.g, ISIAN.no_surat_tugas, "")).toEqual({});
    const n2 = drafLengkap(A);
    P.kirimPengajuan(u.g, A, { nomor: n2 });
    u.db.pengajuan[1]!.status = "diproses";
    expect(() => P.batalkanPengajuan(u.g, A, { nomor: n2 })).toThrow("sudah diproses");
  });
});

describe("Kepemilikan (AKSES-02, FILE-04)", () => {
  it("Karyawan B tidak dapat membuka, mengubah, mengirim, membatalkan, atau mengunduh milik A", () => {
    const nomor = drafLengkap(A);
    const idDok = u.db.dokumen[0]!.id;
    const ditolak = [
      () => P.bukaPengajuan(u.g, B, { nomor }),
      () => P.simpanDraf(u.g, B, { nomor, isian: ISIAN }),
      () => P.unggahDokumen(u.g, B, { nomor, jenis: "formulir", data: b64(PDF) }, dariB64),
      () => P.kirimPengajuan(u.g, B, { nomor }),
      () => P.batalkanPengajuan(u.g, B, { nomor }),
      () => P.unduhDokumen(u.g, B, { id: idDok }),
      () => P.hapusDokumen(u.g, B, { id: idDok }),
    ];
    for (const fn of ditolak) expect(fn).toThrow(/tidak ditemukan/);
    expect(P.pengajuanSaya(u.g, B)).toEqual([]);
    expect(u.db.pengajuan[0]!.kota_tujuan).toBe("Samarinda");
    expect(u.db.dokumen).toHaveLength(4);
  });

  it("pemilik dapat mengunduh dokumennya sendiri", () => {
    const nomor = drafLengkap(A);
    const d = P.bukaPengajuan(u.g, A, { nomor }).dokumen[0]!;
    expect(P.unduhDokumen(u.g, A, { id: d.id })).toEqual({ nama: "surat_tugas.pdf", tipe: "application/pdf", data: b64(PDF) });
  });

  it("semua rute pengajuan hanya untuk Karyawan; Admin dan email tidak terdaftar ditolak", () => {
    const api = (peran: "karyawan" | "admin" | null) => buatApi({ email: () => "x@pegadaian.co.id", rute: RUTE, peranDari: () => peran, sesiAktif: () => true, dalamBatas: () => true });
    for (const nama of ["pengajuanSaya", "bukaPengajuan", "saranTad", "simpanDraf", "unggahDokumen", "hapusDokumen", "unduhDokumen", "kirimPengajuan", "batalkanPengajuan"]) {
      expect(RUTE[nama]!.peran, nama).toEqual(["karyawan"]);
      expect(() => api("admin")(nama, {}), nama).toThrow("Anda tidak memiliki akses");
      expect(() => api(null)(nama, {}), nama).toThrow("Anda tidak memiliki akses");
    }
  });
});

describe("Unggah dokumen (FILE-01, FILE-02)", () => {
  it("jenis file dari isi, bukan nama: .pdf palsu ditolak", () => {
    const { nomor } = P.simpanDraf(u.g, A, { jenis: "klaim_perdin", isian: {} });
    const palsu = new TextEncoder().encode("<html><script>alert(1)</script>");
    expect(() => P.unggahDokumen(u.g, A, { nomor, jenis: "formulir", nama: "formulir.pdf", data: b64(palsu) }, dariB64)).toThrow("Unggah file PDF, JPG, atau PNG.");
    expect(P.unggahDokumen(u.g, A, { nomor, jenis: "formulir", nama: "foto.pdf", data: b64(PNG) }, dariB64)).toMatchObject({ tipe: "image/png" });
    expect(u.file.size).toBe(1);
    expect([...u.file.keys()][0]).toMatch(/^drive-id\d+\.png$/); // nama acak, bukan nama asli
  });

  it("file > 5 MB ditolak di server", () => {
    const { nomor } = P.simpanDraf(u.g, A, { jenis: "klaim_perdin", isian: {} });
    const besar = new Uint8Array(P.MAKS_FILE + 1);
    besar.set(PDF);
    expect(() => P.unggahDokumen(u.g, A, { nomor, jenis: "formulir", data: b64(besar) }, dariB64)).toThrow("melebihi 5 MB");
    expect(u.file.size).toBe(0);
  });

  it("jenis dokumen tidak dikenal ditolak; hapus dokumen membuang file", () => {
    const { nomor } = P.simpanDraf(u.g, A, { jenis: "klaim_perdin", isian: {} });
    expect(() => P.unggahDokumen(u.g, A, { nomor, jenis: "lain", data: b64(PDF) }, dariB64)).toThrow("Jenis dokumen");
    const d = P.unggahDokumen(u.g, A, { nomor, jenis: "formulir", data: b64(PDF) }, dariB64);
    P.hapusDokumen(u.g, A, { id: d.id });
    expect([u.db.dokumen.length, u.file.size]).toEqual([0, 0]);
  });
});

describe("TAD dalam pengajuan (PRD 5.4, 5.7, AKSES-04)", () => {
  it("saran TAD tanpa rekening, NIK tersamar", () => {
    const s = P.saranTad(u.g);
    expect(s[0]).toEqual({ id: "t1", nama: "Yusuf Hidayat", nik: "6471xxxx0001", vendor: "EPS", unit: "Kanwil", belumTerverifikasi: false });
    expect(JSON.stringify(s)).not.toMatch(/SANDI|rekening|bank|6471000000000001/i);
  });

  it("rekening tidak pernah muncul di balasan fungsi karyawan mana pun", () => {
    u.db.tad[0]!.rekening_terenkripsi = REKENING; // seandainya tersimpan polos pun, tidak boleh keluar
    const nomor = drafLengkap(A, [{ id: "t1" }]);
    const balasan = [P.simpanDraf(u.g, A, { nomor, isian: ISIAN, tad: [{ id: "t1" }] }), P.bukaPengajuan(u.g, A, { nomor }), P.pengajuanSaya(u.g, A), P.saranTad(u.g)];
    P.kirimPengajuan(u.g, A, { nomor, pernyataanTad: true });
    balasan.push(P.bukaPengajuan(u.g, A, { nomor }));
    for (const b of balasan) expect(JSON.stringify(b)).not.toContain(REKENING);
  });

  it("satu TAD hanya sekali per Nomor Surat Tugas", () => {
    const n1 = drafLengkap(A, [{ id: "t1" }]);
    P.kirimPengajuan(u.g, A, { nomor: n1, pernyataanTad: true });
    const n2 = drafLengkap(B, [{ id: "t1" }]);
    expect(P.simpanDraf(u.g, B, { nomor: n2, isian: { ...ISIAN, no_surat_tugas: "st/0412/kw-iv/2026" } }).terpakai).toEqual({ t1: n1 });
    expect(() => P.kirimPengajuan(u.g, B, { nomor: n2, pernyataanTad: true })).toThrow(`TAD Yusuf Hidayat sudah diajukan dalam pengajuan ${n1}.`);
    P.simpanDraf(u.g, B, { nomor: n2, isian: { ...ISIAN, no_surat_tugas: "ST/0999/KW-IV/2026" } });
    expect(() => P.kirimPengajuan(u.g, B, { nomor: n2, pernyataanTad: true })).not.toThrow(); // Surat Tugas lain boleh
  });

  it("TAD belum terdaftar masuk data master sebagai input manual tanpa rekening", () => {
    const r = P.simpanDraf(u.g, A, { jenis: "klaim_perdin", isian: ISIAN, tad: [{ id: "t2" }, { baru: { nama: "Siti Baru", nik: "", vendor: "POJ" } }] });
    expect(r.tad.map((t) => [t.nama, t.belumTerverifikasi])).toEqual([["Andi Saputra", false], ["Siti Baru", true]]);
    expect(u.db.tad.at(-1)).toMatchObject({ nama: "Siti Baru", sumber_data: "input_manual", terverifikasi: "tidak", rekening_terenkripsi: "" });
    // NIK yang sudah ada dipakai ulang, tidak membuat data ganda
    P.simpanDraf(u.g, A, { nomor: r.nomor, isian: ISIAN, tad: [{ baru: { nama: "Yusuf H", nik: "6471000000000001" } }] });
    expect(u.db.pengajuan_tad.map((t) => t.tad_id)).toEqual(["t1"]);
    expect(() => P.simpanDraf(u.g, A, { nomor: r.nomor, tad: [{ id: "t1" }, { id: "t1" }] })).toThrow("lebih dari sekali");
    expect(() => P.simpanDraf(u.g, A, { nomor: r.nomor, tad: [{ id: "palsu" }] })).toThrow("tidak ditemukan");
    expect(() => P.simpanDraf(u.g, A, { nomor: r.nomor, tad: [{ baru: { nama: "Ab" } }] })).toThrow("minimal 3");
  });

  it("nominal hanya terlihat setelah Selesai (PRD 5.8)", () => {
    const nomor = drafLengkap(A, [{ id: "t1" }]);
    P.kirimPengajuan(u.g, A, { nomor, pernyataanTad: true });
    Object.assign(u.db.pengajuan[0]!, { nominal_disetujui: "9770000" });
    u.db.pengajuan_tad[0]!.nominal_disetujui = "4510000";
    expect(P.bukaPengajuan(u.g, A, { nomor })).toMatchObject({ nominal: "", tad: [{ nominal: "" }] });
    u.db.pengajuan[0]!.status = "selesai";
    expect(P.bukaPengajuan(u.g, A, { nomor })).toMatchObject({ nominal: "9770000", tad: [{ nominal: "4510000" }] });
  });
});

describe("Pembantu", () => {
  it("magic bytes", () => {
    expect(P.jenisFile(PDF)?.tipe).toBe("application/pdf");
    expect(P.jenisFile(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))?.tipe).toBe("image/jpeg");
    expect(P.jenisFile(PNG)?.tipe).toBe("image/png");
    expect(P.jenisFile(new TextEncoder().encode("GIF89a"))).toBeNull();
    expect(P.jenisFile(new Uint8Array())).toBeNull();
  });

  it("dokumen wajib mengikuti isian", () => {
    expect(P.dokumenWajib({ ...ISIAN, menginap: "tidak", kendaraan_dinas: "ya" })).toEqual(["surat_tugas", "formulir"]);
    expect(P.dokumenWajib(ISIAN)).toEqual(["surat_tugas", "formulir", "kuitansi_hotel", "kuitansi_transportasi"]);
  });

  it("galat pengguna aman ditampilkan", () => {
    expect(() => P.bukaPengajuan(u.g, A, { nomor: "KP-9999" })).toThrow(GalatPengguna);
  });
});
