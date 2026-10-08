-- 0002 Data acuan yang juga dibutuhkan di produksi: jenis layanan Fase 1 dan tarif SPPD (PRD 5.5).
-- Tarif dapat diperbarui Admin lewat aplikasi; baris baru dengan berlaku_mulai baru, bukan menimpa.

INSERT INTO hcs.jenis_layanan (id, kode, nama) VALUES
  (1, 'klaim_perdin',        'Klaim Biaya Perdin'),
  (2, 'klaim_perdin_diklat', 'Klaim Biaya Perdin Diklat'),
  (3, 'permohonan_sppd',     'Permohonan SPPD'),
  (4, 'pemesanan_tiket',     'Pemesanan Tiket Pesawat');

-- SE 145 Tahun 2026. Tanggal berlaku sementara 01-01-2026; sesuaikan bila SE menyebut tanggal lain.
INSERT INTO hcs.tarif_sppd (golongan, komponen, nominal, berlaku_mulai) VALUES
  ('A',   'harian_menginap',             520000, '2026-01-01'),
  ('B',   'harian_menginap',             410000, '2026-01-01'),
  ('C',   'harian_menginap',             300000, '2026-01-01'),
  ('TAD', 'harian_menginap',             210000, '2026-01-01'),
  ('A',   'transport_terminal',          250000, '2026-01-01'),
  ('B',   'transport_terminal',          250000, '2026-01-01'),
  ('C',   'transport_terminal',          250000, '2026-01-01'),
  ('TAD', 'transport_terminal',          175000, '2026-01-01'),
  ('A',   'harian_tidak_menginap_30_60', 350000, '2026-01-01'),
  ('B',   'harian_tidak_menginap_30_60', 250000, '2026-01-01'),
  ('C',   'harian_tidak_menginap_30_60', 180000, '2026-01-01'),
  ('TAD', 'harian_tidak_menginap_30_60', 126000, '2026-01-01'),
  ('A',   'harian_tidak_menginap_60',    380000, '2026-01-01'),
  ('B',   'harian_tidak_menginap_60',    270000, '2026-01-01'),
  ('C',   'harian_tidak_menginap_60',    200000, '2026-01-01'),
  ('TAD', 'harian_tidak_menginap_60',    140000, '2026-01-01'),
  ('A',   'sewa_rumah_bulanan',         3300000, '2026-01-01'),
  ('B',   'sewa_rumah_bulanan',         2200000, '2026-01-01'),
  ('C',   'sewa_rumah_bulanan',         1300000, '2026-01-01');
