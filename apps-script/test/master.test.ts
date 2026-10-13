import { readFileSync } from "node:fs";
import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { petakan } from "../../tampilan/src/unggah";
import { bacaXlsx, buatXlsx } from "../../tampilan/src/xlsx";
import { buatApi, GalatPengguna } from "../src/akses";
import { keBaris } from "../src/data";
import { daftarKaryawan, daftarTad, golonganDari, isianKoreksiJg, KOLOM_HCMS, rapikanTanggal, sinkronHcms, sinkronTad, umurData } from "../src/master";
import { RUTE } from "../src/rute";
import { TABEL, type Baris } from "../src/skema";

const kosong = <T extends keyof typeof TABEL>(t: T, isi: Partial<Baris<T>>) =>
  ({ ...Object.fromEntries(TABEL[t].kolom.map((k) => [k, ""])), ...isi }) as Baris<T>;
const karyawan = (nik: string, isi: Partial<Baris<"karyawan">> = {}) =>
  kosong("karyawan", { nik_pendek: nik, nama: "Nama " + nik, kode_job_grade: "9", kode_unit_kerja: "U1", nama_unit_kerja: "Unit 1", aktif: "ya", ...isi });
const hcms = (nik: string, isi: Record<string, string> = {}) => ({
  nik_pendek: nik, nama: "Nama " + nik, kode_job_grade: "9", kode_unit_kerja: "U1", nama_unit_kerja: "Unit 1", ...isi,
});

describe("Golongan (PKB Pasal 52)", () => {
  it("A ≥ 14, B 11–13, C 4–10, di bawah 4 butuh koreksi JG", () => {
    expect(["16", "14", "13", "11", "10", "4", "3", "0", "", "x"].map(golonganDari)).toEqual(["A", "A", "B", "B", "C", "C", "", "", "", ""]);
  });
});

describe("Sinkronisasi HCMS", () => {
  const lama = [
    karyawan("P1"),
    karyawan("P2", { kode_job_grade: "10", jg_perdin_override: "11" }),
    karyawan("P3"),
    karyawan("P4", { aktif: "tidak" }),
  ];
  const kirim = (baris: unknown[], awal = 2) => ({ namaFile: "ekspor.xlsx", awal, baris });

  it("hanya 12 kolom HCMS yang tersimpan; kolom sensitif dibuang (DATA-05)", () => {
    const { hasil } = sinkronHcms(kirim([{ ...hcms("P9"), "NIK KTP": "6471000000000001", npwp: "123", no_rekening: "999" }]), [], "kini");
    expect(Object.keys(hasil[0]!).sort()).toEqual([...TABEL.karyawan.kolom].sort());
    expect(JSON.stringify(hasil)).not.toMatch(/6471000000000001|npwp|rekening/i);
    expect(Object.values(KOLOM_HCMS)).toHaveLength(12);
  });

  it("ringkasan: baru, tidak ada lagi (dinonaktifkan), berubah JG, pindah unit", () => {
    const { ringkasan: r, hasil } = sinkronHcms(
      kirim([hcms("P1", { kode_job_grade: "11" }), hcms("P2", { kode_unit_kerja: "U2", nama_unit_kerja: "Unit 2", kode_job_grade: "10" }), hcms("P4"), hcms("P5")]),
      lama,
      "kini",
    );
    expect(r.baru.map((x) => x.nik)).toEqual(["P4", "P5"]); // P4 aktif kembali
    expect(r.nonaktif.map((x) => x.nik)).toEqual(["P3"]);
    expect(r.berubahJg).toEqual([{ nik: "P1", nama: "Nama P1", jabatan: "", dari: "JG 9 · C", ke: "JG 11 · B", pindahGolongan: true }]);
    expect(r.pindahUnit.map((x) => x.nik)).toEqual(["P2"]);
    const p3 = hasil.find((k) => k.nik_pendek === "P3")!;
    expect(p3.aktif).toBe("tidak"); // tidak dihapus
    expect(hasil).toHaveLength(5);
  });

  it("koreksi JG untuk Perdin tidak tertimpa sinkronisasi", () => {
    const { hasil } = sinkronHcms(kirim([hcms("P2", { kode_job_grade: "12" })]), lama, "kini");
    expect(hasil.find((k) => k.nik_pendek === "P2")!.jg_perdin_override).toBe("11");
  });

  it("baris bermasalah dilaporkan dengan nomor baris file; baris kosong dilewati", () => {
    const { ringkasan: r } = sinkronHcms(
      kirim([hcms("P1"), {}, hcms(""), hcms("P1"), hcms("P7", { nama: "" }), hcms("P8", { kode_job_grade: "IX" }), hcms("P9", { prim_email: "bukan email" })], 5),
      [],
      "kini",
    );
    expect(r.masalah.map((m) => [m.baris, m.alasan])).toEqual([
      [7, "NIK PENDEK kosong"],
      [8, "NIK PENDEK ganda"],
      [9, "NAMA kosong"],
      [10, "KODE JOB GRADE bukan angka"],
      [11, "PRIM EMAIL tidak valid"],
    ]);
  });

  it("isian berawalan = tersimpan sebagai teks (INPUT-02)", () => {
    const { hasil } = sinkronHcms(kirim([hcms("P1", { nama: '=HYPERLINK("http://x")' })]), [], "kini");
    expect(keBaris("karyawan", hasil[0]!)[1]).toBe(`'=HYPERLINK("http://x")`);
  });

  it("kiriman tidak sah ditolak (INPUT-01)", () => {
    expect(() => sinkronHcms(null, [], "")).toThrow(GalatPengguna);
    expect(() => sinkronHcms({ baris: "x" }, [], "")).toThrow(GalatPengguna);
    expect(() => sinkronHcms({ baris: [] }, [], "")).toThrow("File tidak berisi data.");
    expect(() => sinkronHcms({ baris: Array(5001).fill(hcms("P1")) }, [], "")).toThrow(/lebih dari 5000/);
    const { hasil } = sinkronHcms(kirim([hcms("P1", { nama: "a".repeat(1000) })]), [], "");
    expect(hasil[0]!.nama).toHaveLength(200);
  });
});

describe("Unggah TAD", () => {
  // Enkripsi palsu yang dapat dikenali: rekening asli tidak boleh muncul di keluaran mana pun.
  const kunci = (t: string) => "v1:" + Buffer.from(t).toString("base64");
  const buka = (s: string) => Buffer.from(s.slice(3), "base64").toString();
  const opsi = { kini: "kini", idBaru: () => "id-baru", buka, kunci };
  const nik = (n: number) => "6471" + String(n).padStart(12, "0");
  const rek = (n: number) => "0" + String(n).padStart(14, "0");
  const tad = (n: number, isi: Partial<Baris<"tad">> = {}) =>
    kosong("tad", { id: "id" + n, nik: nik(n), nama: "TAD " + n, nama_bank: "BRI", rekening_terenkripsi: kunci(rek(n)), vendor: "POJ", sumber_data: "unggahan", terverifikasi: "ya", aktif: "ya", ...isi });
  const baris = (n: number, isi: Record<string, string> = {}) => ({ nik: nik(n), nama: "TAD " + n, nama_bank: "BRI", rekening: rek(n), vendor: "POJ", unit_kerja: "", tgl_akhir_kontrak: "", ...isi });

  const lama = [tad(1), tad(2), tad(3), tad(4, { sumber_data: "input_manual", terverifikasi: "tidak" }), tad(5)];
  const kiriman = {
    namaFile: "tad.xlsx",
    baris: [
      baris(1), // tetap
      baris(2, { rekening: "0000-0000-0000-999" }), // rekening berubah, dirapikan jadi angka
      baris(6, { rekening: "12345678901234" }), // 14 digit → ditolak
      baris(7), baris(7, { nama: "Ganda" }), // NIK ganda → keduanya ditolak
      { ...baris(8), nik: "123" }, // NIK salah
      baris(9, { rekening: "", nama_bank: "" }), // rekening kosong → tetap diimpor, ditandai
      baris(5, { rekening: "1" }), // TAD 5 bermasalah → tidak dinonaktifkan
    ],
  };
  const { ringkasan: r, hasil } = sinkronTad(kiriman, lama, opsi);

  it("baris bermasalah ditolak dengan alasan", () => {
    expect(r.masalah.map((m) => [m.baris, m.alasan])).toEqual([
      [4, "Rekening BRI 14 digit, seharusnya 15"],
      [5, "NIK ganda di file"],
      [6, "NIK ganda di file"],
      [7, "NIK bukan 16 digit"],
      [9, "Rekening BRI 1 digit, seharusnya 15"],
    ]);
    expect(r.rekeningKosong.map((x) => x.nik)).toEqual([nik(9)]);
  });

  it("ringkasan baru/berubah/nonaktif; input manual dan NIK bermasalah tidak dinonaktifkan", () => {
    expect(r.baru.map((x) => x.nik)).toEqual([nik(9)]);
    expect(r.berubah.map((x) => x.nik)).toEqual([nik(2)]);
    expect(r.nonaktif.map((x) => x.nik)).toEqual([nik(3)]);
    const status = Object.fromEntries(hasil.map((t) => [t.nik, t.aktif]));
    expect(status).toEqual({ [nik(1)]: "ya", [nik(2)]: "ya", [nik(9)]: "ya", [nik(3)]: "tidak", [nik(4)]: "ya", [nik(5)]: "ya" });
  });

  it("rekening tersimpan terenkripsi; tidak berubah → sandi lama dipakai", () => {
    const t1 = hasil.find((t) => t.nik === nik(1))!;
    const t2 = hasil.find((t) => t.nik === nik(2))!;
    expect(t1.rekening_terenkripsi).toBe(lama[0]!.rekening_terenkripsi);
    expect(buka(t2.rekening_terenkripsi)).toBe("000000000000999");
    expect(hasil.every((t) => !/\d{10}/.test(t.rekening_terenkripsi))).toBe(true);
  });

  it("rekening tidak pernah muncul utuh di ringkasan maupun daftar (AKSES-04, PRD 6.4)", () => {
    const daftar = daftarTad(hasil, {}, (s) => "••••" + buka(s).slice(-4));
    for (const keluaran of [JSON.stringify(r), JSON.stringify(daftar)]) {
      for (const n of [1, 2, 5, 6, 7]) expect(keluaran).not.toContain(rek(n));
      expect(keluaran).not.toContain("12345678901234");
    }
    expect(daftar.baris.find((t) => t.nik === nik(2))!.rekening).toBe("••••0999");
  });

  it("tanggal kontrak dirapikan; tidak dikenal dikosongkan", () => {
    expect(["2026-12-31", "31-12-2026", "31/12/2026", "46387", "belum tahu", "99-99-2026", ""].map(rapikanTanggal)).toEqual([
      "2026-12-31", "2026-12-31", "2026-12-31", "2026-12-31", "", "", "",
    ]);
  });
});

describe("Daftar dan koreksi JG", () => {
  it("daftar per halaman 20, aktif dulu, dapat dicari", () => {
    const semua = Array.from({ length: 45 }, (_, i) => karyawan("P" + String(i).padStart(2, "0"), { aktif: i === 0 ? "tidak" : "ya" }));
    const h0 = daftarKaryawan(semua, {});
    expect([h0.total, h0.baris.length, h0.baris[0]!.nik]).toEqual([45, 20, "P01"]);
    expect(daftarKaryawan(semua, { halaman: 2 }).baris.at(-1)!.nik).toBe("P00");
    expect(daftarKaryawan(semua, { cari: "p4" }).total).toBe(5);
  });

  it("golongan di daftar memakai JG untuk Perdin bila ada", () => {
    const d = daftarKaryawan([karyawan("P1", { kode_job_grade: "0", jg_perdin_override: "12" })], {});
    expect(d.baris[0]).toMatchObject({ jg: "0", jgPerdin: "12", golongan: "B" });
  });

  it("koreksi JG wajib beralasan dan dalam rentang", () => {
    expect(isianKoreksiJg({ nik: "P1", jg: "12", alasan: "Masa persiapan pensiun" })).toEqual({ nik: "P1", jg: "12", alasan: "Masa persiapan pensiun" });
    expect(isianKoreksiJg({ nik: "P1", jg: "", alasan: "Hapus koreksi" }).jg).toBe("");
    expect(() => isianKoreksiJg({ nik: "P1", jg: "12", alasan: "" })).toThrow(/Alasan wajib/);
    expect(() => isianKoreksiJg({ nik: "P1", jg: "3", alasan: "alasan cukup" })).toThrow(/4 sampai 20/);
    expect(() => isianKoreksiJg({ nik: "", jg: "12", alasan: "alasan cukup" })).toThrow(/NIK/);
  });

  it("umur data: hijau < 7 hari, kuning 7–14, merah > 14 atau belum pernah", () => {
    const kini = new Date("2026-10-20T00:00:00Z");
    expect(["2026-10-14T00:00:00Z", "2026-10-13T00:00:00Z", "2026-10-06T00:00:00Z", "2026-10-05T00:00:00Z", ""].map((t) => umurData(t, kini).warna)).toEqual([
      "hijau", "kuning", "kuning", "merah", "merah",
    ]);
  });
});

describe("Akses A5/A6 (AKSES-01)", () => {
  const api = (peran: "karyawan" | "admin") =>
    buatApi({ email: () => "rina@pegadaian.co.id", rute: RUTE, peranDari: () => peran, sesiAktif: () => true, dalamBatas: () => true });

  it("Karyawan tidak dapat memanggil fungsi Data karyawan dan Data TAD", () => {
    for (const nama of ["dataKaryawan", "pratinjauHcms", "terapkanHcms", "koreksiJg", "dataTad", "pratinjauTad", "terapkanTad"]) {
      expect(() => api("karyawan")(nama, {}), nama).toThrow("Anda tidak memiliki akses ke halaman ini.");
    }
  });

  it("setiap rute selain mulai/keluar mewajibkan sesi dan hanya untuk satu peran", () => {
    for (const [nama, r] of Object.entries(RUTE)) {
      if (nama === "mulai" || nama === "keluar") continue;
      expect(r.tanpaSesi, nama).toBeFalsy();
      expect([["admin"], ["karyawan"]], nama).toContainEqual(r.peran);
    }
  });
});

describe("Baca file Excel", () => {
  it("tulis lalu baca kembali (terkompresi), teks dengan nol di depan tetap utuh", async () => {
    const tabel = [["NIK", "NAMA"], ["0012", "A & <B> \"C\""], ["", ""], ["9", "Ñame"]];
    const file = buatXlsx("Uji", tabel, (d) => new Uint8Array(deflateRawSync(d)));
    expect(await bacaXlsx(file)).toEqual(tabel);
    expect(await bacaXlsx(buatXlsx("Uji", tabel))).toEqual(tabel);
  });

  it("file buatan Excel/openpyxl: shared strings, angka besar, judul tidak di baris 1, rumus tidak ikut", async () => {
    const tabel = await bacaXlsx(new Uint8Array(readFileSync(new URL("./contoh/openpyxl.xlsx", import.meta.url))));
    const h = petakan("x.xlsx", tabel, { "NIK PENDEK": "nik_pendek", NAMA: "nama", "KODE JOB GRADE": "kode_job_grade" });
    expect(h).toEqual({
      ok: true, namaFile: "x.xlsx", awal: 4, jumlahKolom: 4,
      baris: [
        { nik_pendek: "P90001", nama: "Andi & <Pratama>", kode_job_grade: "12" },
        { nik_pendek: "P90002", nama: "Bunga", kode_job_grade: "123456789012345" },
      ],
    });
    expect(tabel[3]![3]).toBe(""); // sel rumus =1+1 tidak dibaca sebagai rumus
  });

  it("kolom wajib yang hilang dilaporkan", () => {
    const h = petakan("x.xlsx", [["NIK PENDEK", "NAMA LENGKAP"], ["P1", "A"]], { "NIK PENDEK": "a", NAMA: "b", "PRIM EMAIL": "c" });
    expect(h).toMatchObject({ ok: false, hilang: ["NAMA", "PRIM EMAIL"] });
  });
});
