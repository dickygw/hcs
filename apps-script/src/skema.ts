/**
 * Struktur data HCS (PRD v2.2 7.1). Satu sheet per tabel; nama tabel dan kolom sama dengan PRD v2.1
 * agar dapat dipindah ke database bila kelak diperlukan. Semua sel disimpan sebagai teks (INPUT-02).
 * Perubahan struktur HANYA lewat fungsi migrasi bernomor (WS-13), bukan dengan mengubah sheet manual.
 */

export type Spreadsheet = "Master" | "Data" | "Log";

export interface DefinisiTabel {
  spreadsheet: Spreadsheet;
  kolom: readonly string[];
  /** Disimpan di CacheService. Hanya tabel kecil (master dan sheet aktif), tidak pernah log (Tahap 0). */
  cache: boolean;
}

export const TABEL = {
  // --- HCS_Master
  pengguna: {
    spreadsheet: "Master",
    cache: true,
    kolom: ["email", "peran", "aktif", "dibuat_pada", "diperbarui_pada"],
  },
  // Hanya 12 kolom HCMS (PRD 6.1, DATA-05) + koreksi JG, status aktif, waktu pembaruan.
  karyawan: {
    spreadsheet: "Master",
    cache: true,
    kolom: [
      "nik_pendek", "nama", "prim_email", "emp_type_name", "kode_job_grade", "job_grade_def",
      "position_type_name", "position_name", "kode_unit_kerja", "nama_unit_kerja", "branch_name", "dep_name",
      "jg_perdin_override", "aktif", "diperbarui_pada",
    ],
  },
  tad: {
    spreadsheet: "Master",
    cache: true,
    kolom: [
      "id", "nik", "nama", "nama_bank", "rekening_terenkripsi", "vendor", "unit_kerja", "tgl_akhir_kontrak",
      "sumber_data", "terverifikasi", "aktif", "dibuat_pada", "diperbarui_pada",
    ],
  },
  tarif_sppd: {
    spreadsheet: "Master",
    cache: true,
    kolom: ["golongan", "komponen", "nominal", "berlaku_mulai", "berlaku_sampai", "dibuat_pada"],
  },
  jenis_layanan: {
    spreadsheet: "Master",
    cache: true,
    kolom: ["kode", "nama", "awalan_nomor", "aktif"],
  },
  riwayat_sinkronisasi: {
    spreadsheet: "Master",
    cache: false,
    kolom: ["id", "jenis", "pengguna_email", "nama_file", "jumlah_baru", "jumlah_berubah", "jumlah_nonaktif", "pada"],
  },

  // --- HCS_Data (sheet aktif; > 90 hari setelah selesai pindah ke arsip per tahun)
  pengajuan: {
    spreadsheet: "Data",
    cache: true,
    kolom: [
      "nomor", "jenis_layanan", "nik_pendek", "pemilik_email", "no_surat_tugas", "status",
      "kota_tujuan", "tgl_berangkat", "tgl_kembali", "menginap", "jarak", "moda_transportasi", "kendaraan_dinas",
      "jg_terkunci", "golongan_terkunci", "jabatan_terkunci", "unit_kerja_terkunci",
      "pernyataan_tad", "nominal_disetujui", "dikirim_pada", "dibuat_pada", "diperbarui_pada",
    ],
  },
  pengajuan_tad: {
    spreadsheet: "Data",
    cache: true,
    kolom: [
      "id", "nomor_pengajuan", "tad_id", "no_surat_tugas", "nama_bank_terkunci", "rekening_terkunci",
      "status_rekening", "nominal_disetujui", "aktif", "dibuat_pada", "diperbarui_pada",
    ],
  },
  dokumen: {
    spreadsheet: "Data",
    cache: true,
    kolom: ["id", "nomor_pengajuan", "jenis", "nama_asli", "id_file_drive", "tipe_mime", "ukuran_byte", "pemilik_email", "dibuat_pada"],
  },
  riwayat_status: {
    spreadsheet: "Data",
    cache: true,
    kolom: ["id", "nomor_pengajuan", "status_dari", "status_ke", "oleh_email", "catatan", "pada"],
  },
  notifikasi: {
    spreadsheet: "Data",
    cache: false,
    kolom: ["id", "pengguna_email", "judul", "isi", "tautan", "dibaca_pada", "dibuat_pada"],
  },

  // --- HCS_Log (hanya ditambah; tidak pernah di-cache)
  log_perubahan: {
    spreadsheet: "Log",
    cache: false,
    kolom: ["id", "pengguna_email", "tabel", "kunci_baris", "jenis_perubahan", "nilai_lama", "nilai_baru", "alasan", "pada"],
  },
  log_akses_rekening: {
    spreadsheet: "Log",
    cache: false,
    kolom: ["id", "pengguna_email", "jenis", "nomor_pengajuan", "jumlah_rekening", "pada"],
  },
  antrean_email: {
    spreadsheet: "Log",
    cache: false,
    kolom: ["id", "kepada", "subjek", "isi", "status", "percobaan", "kesalahan_terakhir", "dijadwalkan_pada", "terkirim_pada", "dibuat_pada"],
  },
  log_kinerja: {
    spreadsheet: "Log",
    cache: false,
    kolom: ["pada", "aksi", "total_ms", "server_ms", "perangkat", "pengguna_email", "sukses"],
  },
} as const satisfies Record<string, DefinisiTabel>;

export type NamaTabel = keyof typeof TABEL;
export type Baris<T extends NamaTabel> = Record<(typeof TABEL)[T]["kolom"][number], string>;
