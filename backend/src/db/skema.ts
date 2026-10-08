/**
 * Cerminan tabel di database/migrations/ untuk Drizzle ORM.
 * Sumber kebenaran tetap file migrasi SQL; ubah keduanya bersamaan.
 */
import {
  bigint,
  boolean,
  date,
  integer,
  jsonb,
  pgSchema,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const hcs = pgSchema("hcs");

const id = () => bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity();
const ref = (nama: string) => bigint(nama, { mode: "number" });
const rupiah = (nama: string) => bigint(nama, { mode: "number" });
const waktu = (nama: string) => timestamp(nama, { withTimezone: true });

export const pengguna = hcs.table("pengguna", {
  id: id(),
  email: text("email").notNull().unique(),
  peran: text("peran", { enum: ["karyawan", "admin"] }).notNull(),
  aktif: boolean("aktif").notNull().default(true),
  dibuatPada: waktu("dibuat_pada").notNull().defaultNow(),
  diperbaruiPada: waktu("diperbarui_pada").notNull().defaultNow(),
});

export const karyawan = hcs.table("karyawan", {
  id: id(),
  nikPendek: text("nik_pendek").notNull().unique(),
  nama: text("nama").notNull(),
  primEmail: text("prim_email"),
  empTypeName: text("emp_type_name"),
  kodeJobGrade: text("kode_job_grade"),
  jobGradeDef: text("job_grade_def"),
  positionTypeName: text("position_type_name"),
  positionName: text("position_name"),
  kodeUnitKerja: text("kode_unit_kerja"),
  namaUnitKerja: text("nama_unit_kerja"),
  branchName: text("branch_name"),
  depName: text("dep_name"),
  jgPerdinOverride: smallint("jg_perdin_override"),
  aktif: boolean("aktif").notNull().default(true),
  diperbaruiPada: waktu("diperbarui_pada").notNull().defaultNow(),
});

export const tad = hcs.table("tad", {
  id: id(),
  nik: text("nik"),
  nama: text("nama").notNull(),
  namaBank: text("nama_bank"),
  rekeningTerenkripsi: text("rekening_terenkripsi"),
  vendor: text("vendor"),
  unitKerja: text("unit_kerja"),
  tglAkhirKontrak: date("tgl_akhir_kontrak"),
  sumberData: text("sumber_data", { enum: ["unggahan", "input_manual"] }).notNull(),
  terverifikasi: boolean("terverifikasi").notNull().default(false),
  aktif: boolean("aktif").notNull().default(true),
  dibuatPada: waktu("dibuat_pada").notNull().defaultNow(),
  diperbaruiPada: waktu("diperbarui_pada").notNull().defaultNow(),
});

export const tarifSppd = hcs.table("tarif_sppd", {
  id: id(),
  golongan: text("golongan", { enum: ["A", "B", "C", "TAD"] }).notNull(),
  komponen: text("komponen", {
    enum: [
      "harian_menginap",
      "transport_terminal",
      "harian_tidak_menginap_30_60",
      "harian_tidak_menginap_60",
      "sewa_rumah_bulanan",
    ],
  }).notNull(),
  nominal: rupiah("nominal").notNull(),
  berlakuMulai: date("berlaku_mulai").notNull(),
  berlakuSampai: date("berlaku_sampai"),
  dibuatPada: waktu("dibuat_pada").notNull().defaultNow(),
});

export const jenisLayanan = hcs.table("jenis_layanan", {
  id: smallint("id").primaryKey(),
  kode: text("kode").notNull().unique(),
  nama: text("nama").notNull(),
  aktif: boolean("aktif").notNull().default(true),
});

export const pengajuan = hcs.table("pengajuan", {
  id: id(),
  nomor: text("nomor").notNull().unique(),
  jenisLayananId: smallint("jenis_layanan_id").notNull().references(() => jenisLayanan.id),
  karyawanId: ref("karyawan_id").notNull().references(() => karyawan.id),
  noSuratTugas: text("no_surat_tugas"),
  status: text("status", {
    enum: ["draf", "dikirim", "diproses", "perlu_revisi", "selesai", "ditolak", "dibatalkan"],
  })
    .notNull()
    .default("draf"),
  kotaTujuan: text("kota_tujuan"),
  tglBerangkat: date("tgl_berangkat"),
  tglKembali: date("tgl_kembali"),
  menginap: boolean("menginap"),
  jarak: text("jarak", { enum: ["30_60", "lebih_60"] }),
  modaTransportasi: text("moda_transportasi", { enum: ["pesawat", "kapal", "kereta", "darat"] }),
  kendaraanDinas: boolean("kendaraan_dinas"),
  jgTerkunci: text("jg_terkunci"),
  golonganTerkunci: text("golongan_terkunci", { enum: ["A", "B", "C"] }),
  jabatanTerkunci: text("jabatan_terkunci"),
  unitKerjaTerkunci: text("unit_kerja_terkunci"),
  pernyataanTad: boolean("pernyataan_tad").notNull().default(false),
  nominalDisetujui: rupiah("nominal_disetujui"),
  dikirimPada: waktu("dikirim_pada"),
  dibuatPada: waktu("dibuat_pada").notNull().defaultNow(),
  diperbaruiPada: waktu("diperbarui_pada").notNull().defaultNow(),
});

export const pengajuanTad = hcs.table("pengajuan_tad", {
  id: id(),
  pengajuanId: ref("pengajuan_id").notNull().references(() => pengajuan.id),
  tadId: ref("tad_id").notNull().references(() => tad.id),
  noSuratTugas: text("no_surat_tugas").notNull(),
  namaBankTerkunci: text("nama_bank_terkunci"),
  rekeningTerkunci: text("rekening_terkunci"),
  statusRekening: text("status_rekening", { enum: ["lengkap", "belum_lengkap"] })
    .notNull()
    .default("belum_lengkap"),
  nominalDisetujui: rupiah("nominal_disetujui"),
  aktif: boolean("aktif").notNull().default(true),
  dibuatPada: waktu("dibuat_pada").notNull().defaultNow(),
  diperbaruiPada: waktu("diperbarui_pada").notNull().defaultNow(),
});

export const dokumen = hcs.table("dokumen", {
  id: id(),
  pengajuanId: ref("pengajuan_id").references(() => pengajuan.id),
  jenis: text("jenis", { enum: ["surat_tugas", "invoice", "formulir", "lainnya"] }).notNull(),
  namaAsli: text("nama_asli").notNull(),
  kunciStorage: text("kunci_storage").notNull().unique(),
  tipeMime: text("tipe_mime", { enum: ["application/pdf", "image/jpeg", "image/png"] }).notNull(),
  ukuranByte: integer("ukuran_byte").notNull(),
  pemilikId: ref("pemilik_id").notNull().references(() => pengguna.id),
  dibuatPada: waktu("dibuat_pada").notNull().defaultNow(),
});

export const riwayatStatus = hcs.table("riwayat_status", {
  id: id(),
  pengajuanId: ref("pengajuan_id").notNull().references(() => pengajuan.id),
  statusDari: text("status_dari"),
  statusKe: text("status_ke").notNull(),
  olehId: ref("oleh_id").notNull().references(() => pengguna.id),
  catatan: text("catatan"),
  pada: waktu("pada").notNull().defaultNow(),
});

export const notifikasi = hcs.table("notifikasi", {
  id: id(),
  penggunaId: ref("pengguna_id").notNull().references(() => pengguna.id),
  judul: text("judul").notNull(),
  isi: text("isi"),
  tautan: text("tautan"),
  dibacaPada: waktu("dibaca_pada"),
  dibuatPada: waktu("dibuat_pada").notNull().defaultNow(),
});

export const antreanEmail = hcs.table("antrean_email", {
  id: id(),
  kepada: text("kepada").notNull(),
  subjek: text("subjek").notNull(),
  isi: text("isi").notNull(),
  status: text("status", { enum: ["menunggu", "terkirim", "gagal"] }).notNull().default("menunggu"),
  percobaan: smallint("percobaan").notNull().default(0),
  kesalahanTerakhir: text("kesalahan_terakhir"),
  dijadwalkanPada: waktu("dijadwalkan_pada").notNull().defaultNow(),
  terkirimPada: waktu("terkirim_pada"),
  dibuatPada: waktu("dibuat_pada").notNull().defaultNow(),
});

export const logPerubahan = hcs.table("log_perubahan", {
  id: id(),
  penggunaId: ref("pengguna_id").references(() => pengguna.id),
  tabel: text("tabel").notNull(),
  barisId: ref("baris_id"),
  jenisPerubahan: text("jenis_perubahan").notNull(),
  nilaiLama: jsonb("nilai_lama"),
  nilaiBaru: jsonb("nilai_baru"),
  alasan: text("alasan"),
  pada: waktu("pada").notNull().defaultNow(),
});

export const logAksesRekening = hcs.table("log_akses_rekening", {
  id: id(),
  penggunaId: ref("pengguna_id").notNull().references(() => pengguna.id),
  jenis: text("jenis", { enum: ["cetak", "ekspor"] }).notNull(),
  pengajuanId: ref("pengajuan_id").references(() => pengajuan.id),
  jumlahRekening: integer("jumlah_rekening").notNull(),
  pada: waktu("pada").notNull().defaultNow(),
});

export const riwayatSinkronisasi = hcs.table("riwayat_sinkronisasi", {
  id: id(),
  jenis: text("jenis", { enum: ["hcms", "tad"] }).notNull(),
  penggunaId: ref("pengguna_id").references(() => pengguna.id),
  namaFile: text("nama_file").notNull(),
  jumlahBaru: integer("jumlah_baru").notNull().default(0),
  jumlahBerubah: integer("jumlah_berubah").notNull().default(0),
  jumlahNonaktif: integer("jumlah_nonaktif").notNull().default(0),
  pada: waktu("pada").notNull().defaultNow(),
});
