-- 0001 Skema awal HCS (PRD 7.1)
-- Lima lapis kunci Supabase: skema khusus hcs (SUPA-07), RLS tolak semua tanpa policy (SUPA-08),
-- REVOKE anon/authenticated (SUPA-09), peran terbatas hcs_app (SUPA-11).

-- ---------------------------------------------------------------------------
-- Skema
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS hcs;

-- ---------------------------------------------------------------------------
-- Tabel
-- ---------------------------------------------------------------------------
CREATE TABLE hcs.pengguna (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email           text NOT NULL UNIQUE CHECK (email = lower(email)),
  peran           text NOT NULL CHECK (peran IN ('karyawan', 'admin')),
  aktif           boolean NOT NULL DEFAULT true,
  dibuat_pada     timestamptz NOT NULL DEFAULT now(),
  diperbarui_pada timestamptz NOT NULL DEFAULT now()
);

-- Hanya 12 kolom HCMS (PRD 6.1, DATA-05). Disimpan apa adanya sebagai teks.
CREATE TABLE hcs.karyawan (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nik_pendek          text NOT NULL UNIQUE,
  nama                text NOT NULL,
  prim_email          text,
  emp_type_name       text,
  kode_job_grade      text,
  job_grade_def       text,
  position_type_name  text,
  position_name       text,
  kode_unit_kerja     text,
  nama_unit_kerja     text,
  branch_name         text,
  dep_name            text,
  jg_perdin_override  smallint CHECK (jg_perdin_override BETWEEN 0 AND 30),
  aktif               boolean NOT NULL DEFAULT true,
  diperbarui_pada     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX karyawan_prim_email_idx ON hcs.karyawan (lower(prim_email));

CREATE TABLE hcs.tad (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nik                   text,
  nama                  text NOT NULL,
  nama_bank             text,
  rekening_terenkripsi  text,  -- AES-256-GCM (DATA-01), tidak pernah angka polos
  vendor                text,
  unit_kerja            text,
  tgl_akhir_kontrak     date,
  sumber_data           text NOT NULL CHECK (sumber_data IN ('unggahan', 'input_manual')),
  terverifikasi         boolean NOT NULL DEFAULT false,
  aktif                 boolean NOT NULL DEFAULT true,
  dibuat_pada           timestamptz NOT NULL DEFAULT now(),
  diperbarui_pada       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX tad_nik_unik ON hcs.tad (nik) WHERE nik IS NOT NULL;

-- Nominal dalam rupiah penuh. Komponen mengikuti PRD 5.5.
CREATE TABLE hcs.tarif_sppd (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  golongan        text NOT NULL CHECK (golongan IN ('A', 'B', 'C', 'TAD')),
  komponen        text NOT NULL CHECK (komponen IN (
                    'harian_menginap',
                    'transport_terminal',
                    'harian_tidak_menginap_30_60',
                    'harian_tidak_menginap_60',
                    'sewa_rumah_bulanan')),
  nominal         bigint NOT NULL CHECK (nominal >= 0),
  berlaku_mulai   date NOT NULL,
  berlaku_sampai  date CHECK (berlaku_sampai IS NULL OR berlaku_sampai >= berlaku_mulai),
  dibuat_pada     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (golongan, komponen, berlaku_mulai)
);

CREATE TABLE hcs.jenis_layanan (
  id     smallint PRIMARY KEY,
  kode   text NOT NULL UNIQUE,
  nama   text NOT NULL,
  aktif  boolean NOT NULL DEFAULT true
);

CREATE TABLE hcs.pengajuan (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nomor                 text NOT NULL UNIQUE,
  jenis_layanan_id      smallint NOT NULL REFERENCES hcs.jenis_layanan (id),
  karyawan_id           bigint NOT NULL REFERENCES hcs.karyawan (id),
  no_surat_tugas        text,
  status                text NOT NULL DEFAULT 'draf' CHECK (status IN (
                          'draf', 'dikirim', 'diproses', 'perlu_revisi', 'selesai', 'ditolak', 'dibatalkan')),
  kota_tujuan           text,
  tgl_berangkat         date,
  tgl_kembali           date,
  menginap              boolean,
  jarak                 text CHECK (jarak IN ('30_60', 'lebih_60')),
  moda_transportasi     text CHECK (moda_transportasi IN ('pesawat', 'kapal', 'kereta', 'darat')),
  kendaraan_dinas       boolean,
  -- Salinan terkunci saat dikirim (PRD 5.6)
  jg_terkunci           text,
  golongan_terkunci     text CHECK (golongan_terkunci IN ('A', 'B', 'C')),
  jabatan_terkunci      text,
  unit_kerja_terkunci   text,
  pernyataan_tad        boolean NOT NULL DEFAULT false,
  nominal_disetujui     bigint CHECK (nominal_disetujui >= 0),
  dikirim_pada          timestamptz,
  dibuat_pada           timestamptz NOT NULL DEFAULT now(),
  diperbarui_pada       timestamptz NOT NULL DEFAULT now(),
  CHECK (tgl_kembali IS NULL OR tgl_berangkat IS NULL OR tgl_kembali >= tgl_berangkat)
);
CREATE INDEX pengajuan_karyawan_idx ON hcs.pengajuan (karyawan_id);
CREATE INDEX pengajuan_surat_tugas_idx ON hcs.pengajuan (no_surat_tugas);
CREATE INDEX pengajuan_status_idx ON hcs.pengajuan (status);

CREATE TABLE hcs.pengajuan_tad (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pengajuan_id          bigint NOT NULL REFERENCES hcs.pengajuan (id),
  tad_id                bigint NOT NULL REFERENCES hcs.tad (id),
  no_surat_tugas        text NOT NULL,
  nama_bank_terkunci    text,
  rekening_terkunci     text,  -- terenkripsi (DATA-01)
  status_rekening       text NOT NULL DEFAULT 'belum_lengkap' CHECK (status_rekening IN ('lengkap', 'belum_lengkap')),
  nominal_disetujui     bigint CHECK (nominal_disetujui >= 0),
  aktif                 boolean NOT NULL DEFAULT true,
  dibuat_pada           timestamptz NOT NULL DEFAULT now(),
  diperbarui_pada       timestamptz NOT NULL DEFAULT now()
);
-- Satu TAD hanya sekali per Nomor Surat Tugas (PRD 5.4)
CREATE UNIQUE INDEX pengajuan_tad_unik ON hcs.pengajuan_tad (no_surat_tugas, tad_id) WHERE aktif;
CREATE INDEX pengajuan_tad_pengajuan_idx ON hcs.pengajuan_tad (pengajuan_id);

CREATE TABLE hcs.dokumen (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pengajuan_id   bigint REFERENCES hcs.pengajuan (id),
  jenis          text NOT NULL CHECK (jenis IN ('surat_tugas', 'invoice', 'formulir', 'lainnya')),
  nama_asli      text NOT NULL,
  kunci_storage  text NOT NULL UNIQUE,  -- nama acak di bucket (FILE-03)
  tipe_mime      text NOT NULL CHECK (tipe_mime IN ('application/pdf', 'image/jpeg', 'image/png')),
  ukuran_byte    integer NOT NULL CHECK (ukuran_byte > 0 AND ukuran_byte <= 5242880),
  pemilik_id     bigint NOT NULL REFERENCES hcs.pengguna (id),
  dibuat_pada    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dokumen_pengajuan_idx ON hcs.dokumen (pengajuan_id);

CREATE TABLE hcs.riwayat_status (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pengajuan_id  bigint NOT NULL REFERENCES hcs.pengajuan (id),
  status_dari   text,
  status_ke     text NOT NULL,
  oleh_id       bigint NOT NULL REFERENCES hcs.pengguna (id),
  catatan       text,
  pada          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX riwayat_status_pengajuan_idx ON hcs.riwayat_status (pengajuan_id);

CREATE TABLE hcs.notifikasi (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pengguna_id  bigint NOT NULL REFERENCES hcs.pengguna (id),
  judul        text NOT NULL,
  isi          text,
  tautan       text,
  dibaca_pada  timestamptz,
  dibuat_pada  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifikasi_pengguna_idx ON hcs.notifikasi (pengguna_id, dibaca_pada);

CREATE TABLE hcs.antrean_email (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kepada              text NOT NULL,
  subjek              text NOT NULL,
  isi                 text NOT NULL,
  status              text NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'terkirim', 'gagal')),
  percobaan           smallint NOT NULL DEFAULT 0,
  kesalahan_terakhir  text,
  dijadwalkan_pada    timestamptz NOT NULL DEFAULT now(),
  terkirim_pada       timestamptz,
  dibuat_pada         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX antrean_email_status_idx ON hcs.antrean_email (status, dijadwalkan_pada);

CREATE TABLE hcs.log_perubahan (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pengguna_id      bigint REFERENCES hcs.pengguna (id),
  tabel            text NOT NULL,
  baris_id         bigint,
  jenis_perubahan  text NOT NULL,
  nilai_lama       jsonb,
  nilai_baru       jsonb,
  alasan           text,
  pada             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE hcs.log_akses_rekening (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pengguna_id      bigint NOT NULL REFERENCES hcs.pengguna (id),
  jenis            text NOT NULL CHECK (jenis IN ('cetak', 'ekspor')),
  pengajuan_id     bigint REFERENCES hcs.pengajuan (id),
  jumlah_rekening  integer NOT NULL CHECK (jumlah_rekening >= 0),
  pada             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE hcs.riwayat_sinkronisasi (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  jenis            text NOT NULL CHECK (jenis IN ('hcms', 'tad')),
  pengguna_id      bigint REFERENCES hcs.pengguna (id),
  nama_file        text NOT NULL,
  jumlah_baru      integer NOT NULL DEFAULT 0,
  jumlah_berubah   integer NOT NULL DEFAULT 0,
  jumlah_nonaktif  integer NOT NULL DEFAULT 0,
  pada             timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- RLS tolak semua (SUPA-08): aktif + dipaksa, TANPA policy apa pun.
-- ---------------------------------------------------------------------------
ALTER TABLE hcs.pengguna             ENABLE ROW LEVEL SECURITY; ALTER TABLE hcs.pengguna             FORCE ROW LEVEL SECURITY;
ALTER TABLE hcs.karyawan             ENABLE ROW LEVEL SECURITY; ALTER TABLE hcs.karyawan             FORCE ROW LEVEL SECURITY;
ALTER TABLE hcs.tad                  ENABLE ROW LEVEL SECURITY; ALTER TABLE hcs.tad                  FORCE ROW LEVEL SECURITY;
ALTER TABLE hcs.tarif_sppd           ENABLE ROW LEVEL SECURITY; ALTER TABLE hcs.tarif_sppd           FORCE ROW LEVEL SECURITY;
ALTER TABLE hcs.jenis_layanan        ENABLE ROW LEVEL SECURITY; ALTER TABLE hcs.jenis_layanan        FORCE ROW LEVEL SECURITY;
ALTER TABLE hcs.pengajuan            ENABLE ROW LEVEL SECURITY; ALTER TABLE hcs.pengajuan            FORCE ROW LEVEL SECURITY;
ALTER TABLE hcs.pengajuan_tad        ENABLE ROW LEVEL SECURITY; ALTER TABLE hcs.pengajuan_tad        FORCE ROW LEVEL SECURITY;
ALTER TABLE hcs.dokumen              ENABLE ROW LEVEL SECURITY; ALTER TABLE hcs.dokumen              FORCE ROW LEVEL SECURITY;
ALTER TABLE hcs.riwayat_status       ENABLE ROW LEVEL SECURITY; ALTER TABLE hcs.riwayat_status       FORCE ROW LEVEL SECURITY;
ALTER TABLE hcs.notifikasi           ENABLE ROW LEVEL SECURITY; ALTER TABLE hcs.notifikasi           FORCE ROW LEVEL SECURITY;
ALTER TABLE hcs.antrean_email        ENABLE ROW LEVEL SECURITY; ALTER TABLE hcs.antrean_email        FORCE ROW LEVEL SECURITY;
ALTER TABLE hcs.log_perubahan        ENABLE ROW LEVEL SECURITY; ALTER TABLE hcs.log_perubahan        FORCE ROW LEVEL SECURITY;
ALTER TABLE hcs.log_akses_rekening   ENABLE ROW LEVEL SECURITY; ALTER TABLE hcs.log_akses_rekening   FORCE ROW LEVEL SECURITY;
ALTER TABLE hcs.riwayat_sinkronisasi ENABLE ROW LEVEL SECURITY; ALTER TABLE hcs.riwayat_sinkronisasi FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Cabut hak anon/authenticated (SUPA-09), termasuk untuk objek yang dibuat nanti.
-- ---------------------------------------------------------------------------
REVOKE ALL ON SCHEMA hcs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES    IN SCHEMA hcs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA hcs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA hcs FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA hcs REVOKE ALL ON TABLES    FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA hcs REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA hcs REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- Skema public dibiarkan kosong dan tertutup (SUPA-07).
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- Peran aplikasi hcs_app (SUPA-11). Password diatur oleh skrip migrasi dari .env,
-- tidak pernah ditulis di file ini.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hcs_app') THEN
    CREATE ROLE hcs_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT BYPASSRLS;
  END IF;
END
$$;
ALTER ROLE hcs_app SET search_path = hcs;
ALTER ROLE hcs_app SET statement_timeout = '15s';

GRANT USAGE ON SCHEMA hcs TO hcs_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA hcs TO hcs_app;

-- Tabel kerja: baca, tambah, ubah. Tidak ada DELETE (data dinonaktifkan, bukan dihapus).
GRANT SELECT, INSERT, UPDATE ON
  hcs.pengguna, hcs.karyawan, hcs.tad, hcs.tarif_sppd, hcs.jenis_layanan,
  hcs.pengajuan, hcs.pengajuan_tad, hcs.dokumen, hcs.notifikasi, hcs.antrean_email
TO hcs_app;

-- Tabel log: hanya baca dan tambah. Tidak bisa diubah atau dihapus.
GRANT SELECT, INSERT ON
  hcs.riwayat_status, hcs.log_perubahan, hcs.log_akses_rekening, hcs.riwayat_sinkronisasi
TO hcs_app;
