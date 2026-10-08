# PRD — HCS (Human Capital System) Versi Google Workspace

| | |
|---|---|
| **Versi** | 1.0 (Draft) |
| **Tanggal** | 29-09-2026 |
| **Lingkup penggunaan** | Kantor Wilayah IV Balikpapan |
| **Platform** | Google Workspace Pegadaian (Apps Script, Sheets, Drive, Gmail) |
| **Dokumen terkait** | PRD HCS Versi Server v1.1 (jalur cadangan), Design Brief v1.0 |
| **Status** | Menunggu persetujuan |

---

## 1. Keputusan Arsitektur Dua Jalur

HCS memiliki dua PRD yang disimpan berdampingan:

| Jalur | Dokumen | Status |
|---|---|---|
| **Jalur A — Google Workspace** | Dokumen ini | **Dibangun sekarang** |
| **Jalur B — Server (Google Cloud)** | PRD HCS Versi Server v1.1 | **Cadangan**, diaktifkan jika pemicu migrasi terpenuhi (Bagian 12) |

Alasan memilih Jalur A terlebih dahulu:
1. Berjalan sepenuhnya di dalam Google Workspace Pegadaian yang sudah resmi digunakan perusahaan.
2. Tidak memerlukan billing, server, atau konfigurasi dari TI pusat.
3. Tanpa biaya tambahan (sudah termasuk langganan Workspace).
4. Kapasitas memadai untuk skala satu Kantor Wilayah.

Agar perpindahan ke Jalur B mudah, **struktur data Jalur A dibuat sama dengan skema database Jalur B** (nama tabel dan kolom identik).

---

## 2. Latar Belakang Masalah

- Karyawan bingung cara mengajukan hak klaim: Klaim Biaya Perdin, Klaim Biaya Perdin Diklat, Permohonan SPPD, dan Pemesanan Tiket Pesawat.
- Pengajuan masuk melalui empat saluran: formulir kertas, email, WhatsApp, dan aplikasi E-Office.
- Admin SDM harus memeriksa semua saluran setiap pagi.
- Sering terjadi pembayaran ganda karena pengajuan yang sama dikirim lewat email dan WhatsApp.
- Admin sulit melacak sejauh mana setiap pengajuan diproses.
- Dokumen cetak mudah hilang dan tidak tersimpan rapi.

## 3. Sasaran dan Ukuran Keberhasilan

- SLA pembayaran klaim lebih cepat **40%**.
- Waktu pemeriksaan harian Admin turun menjadi **10 menit per hari**.
- Seluruh pengajuan masuk melalui **satu pintu** (HCS).

## 4. Ruang Lingkup

**Termasuk:** Klaim Biaya Perdin, Klaim Biaya Perdin Diklat, Permohonan SPPD, Pemesanan Tiket Pesawat.

**Tidak termasuk:** proses transfer pembayaran, manajemen anggaran, persetujuan atasan berjenjang, dan klaim non-perjalanan (kacamata, kesehatan, dan sejenisnya).

## 5. Pengguna dan Hak Akses

| Peran | Jumlah | Hak akses |
|---|---|---|
| **Karyawan** | ±1.000 | Mengajukan, menyimpan draf, membatalkan sebelum diproses, mengedit dan mengirim ulang saat "Perlu revisi", melihat riwayat dan status pengajuan sendiri |
| **Admin SDM** | 3–5 | Melihat semua pengajuan, mengubah status, meminta revisi atau menolak, mencetak dan mengekspor, mengelola inbox "Tugasku", menyusun dan menyesuaikan perhitungan SPPD, mengelola data master |

Peran ditentukan dari sheet **Pengguna** yang memetakan alamat email ke peran.

## 6. Aturan Bisnis

### 6.1 Alur layanan
- **Nomor Surat Tugas** menghubungkan Permohonan SPPD → Pemesanan Tiket Pesawat → Klaim Perdin sebagai satu alur. Satu Surat Tugas dapat mencakup beberapa karyawan.
- Klaim Perdin Diklat menggunakan **Nomor Surat Pemanggilan Workshop/Diklat**.
- Setiap Permohonan SPPD dan Pemesanan Tiket otomatis masuk ke **Tugasku** Admin.

### 6.2 Status pengajuan
`Draf → Dikirim → Diproses → Selesai / Ditolak`
Jika diminta revisi: `Perlu revisi → diedit → Dikirim ulang` (nomor pengajuan tetap sama).

### 6.3 Dokumen wajib
Surat Tugas atau Surat Pemanggilan, Invoice/Kuitansi, dan Formulir Pengajuan.

### 6.4 Deteksi duplikasi
Jika sudah ada pengajuan aktif dengan kombinasi **Nomor Surat Tugas + karyawan + jenis layanan** yang sama, Admin mendapat **peringatan**. Sistem tidak memblokir otomatis.

### 6.5 Perhitungan SPPD otomatis
Acuan utama: **SE 145 Tahun 2026** (Petunjuk Pelaksanaan Perjalanan Dinas), dengan dasar PerDir 39 Tahun 2026 dan PKB 2026–2028.

**Penentuan golongan (PKB Pasal 52):**

| Golongan | Job Grade |
|---|---|
| A | JG 14 ke atas |
| B | JG 11 – 13 |
| C | JG 4 – 10 |

**Uang harian perjalanan menginap (lumpsum per hari):**

| Komponen | Gol. A | Gol. B | Gol. C |
|---|---|---|---|
| Transportasi lokal, uang makan, cuci pakaian | Rp520.000 | Rp410.000 | Rp300.000 |
| Transportasi ke/dari bandara, stasiun, terminal, pelabuhan (per sekali jalan) | Rp250.000 | Rp250.000 | Rp250.000 |

Jika menggunakan kendaraan dinas, uang harian menginap tetap dibayarkan 100%.

**Uang harian perjalanan tidak menginap (jarak lebih dari 30 km):**

| Jarak | Gol. A | Gol. B | Gol. C |
|---|---|---|---|
| >30 – 60 km | Rp350.000 | Rp250.000 | Rp180.000 |
| >60 km | Rp380.000 | Rp270.000 | Rp200.000 |

Jika menggunakan kendaraan dinas, uang harian dibayarkan 50% dan transportasi ke/dari bandara/stasiun/terminal/pelabuhan tidak dibayarkan.

**Ketentuan lain:**
- Tenaga Alih Daya (TAD): 70% dari uang harian Golongan C.
- Penugasan lebih dari 12 hari dan menginap: bantuan sewa rumah per bulan Rp3.300.000 (A), Rp2.200.000 (B), Rp1.300.000 (C).
- Transportasi dan hotel dibayarkan sesuai biaya riil (at cost).
- Tarif disimpan di sheet **TarifSPPD** sehingga dapat diperbarui Admin tanpa mengubah kode.
- Admin dapat menyesuaikan hasil perhitungan; setiap penyesuaian dicatat (siapa, kapan, nilai lama → nilai baru).

## 7. Arsitektur Teknis

| Komponen | Teknologi | Keterangan |
|---|---|---|
| Aplikasi | **Google Apps Script Web App** | Aplikasi satu halaman (dimuat sekali, pindah menu tanpa muat ulang) |
| Akun pemilik | **Akun unit SDM Kanwil IV** | Bukan akun pribadi, agar aplikasi tidak bergantung pada satu orang |
| Akses | Hanya akun **pegadaian.co.id** | Login otomatis memakai akun Google yang sedang aktif |
| Data | **Google Sheets** | Satu sheet per tabel, tanpa rumus |
| Dokumen | **Google Drive** | Folder milik akun unit, tidak dibagikan langsung ke pengguna |
| Email | **Gmail akun unit** (MailApp) | Dikirim melalui antrean |
| Tugas terjadwal | **Trigger Apps Script** | Antrean email, ringkasan harian, backup, arsip |
| Cache | **CacheService** | Data master dan tarif |
| Pengembangan | **clasp + Git** di Google Antigravity | Kode dikelola di repo lokal lalu dikirim ke Apps Script |

### 7.1 Struktur data
Data dipisah ke beberapa spreadsheet agar tetap ringan:

| Spreadsheet | Sheet (tabel) |
|---|---|
| HCS_Data | Pengajuan, Dokumen, RiwayatStatus, Notifikasi |
| HCS_Master | Pengguna, Karyawan, TarifSPPD, JenisLayanan |
| HCS_Log | LogPerubahan, AntreanEmail |
| HCS_Arsip_[tahun] | Pengajuan yang sudah Selesai/Ditolak lebih dari 90 hari |

Nama tabel dan kolom mengikuti skema database pada PRD Versi Server.

### 7.2 Penyimpanan dokumen
- Struktur folder: `HCS/Dokumen/[tahun]/[nomor pengajuan]/`.
- Dokumen hanya dapat dibuka melalui HCS oleh pemilik pengajuan dan Admin.
- Ukuran maksimal 5 MB per file (PDF, JPG, PNG). Foto otomatis diperkecil di perangkat sebelum diunggah.

## 8. Notifikasi

**Saluran:** email ke alamat pegadaian.co.id dan lonceng notifikasi di dalam aplikasi.

| Kejadian | Penerima | Email | In-app |
|---|---|---|---|
| Pengajuan berhasil dikirim | Karyawan | Ya | Ya |
| Pengajuan diminta revisi | Karyawan | Ya | Ya |
| Pengajuan selesai | Karyawan | Ya | Ya |
| Pengajuan ditolak (beserta alasan) | Karyawan | Ya | Ya |
| Status berubah menjadi Diproses | Karyawan | Tidak | Ya |
| Pengajuan baru masuk Tugasku | Admin SDM | Tidak | Ya |
| Ringkasan harian isi Tugasku | Admin SDM | Ya, hari kerja pukul 07.00 WITA* | Tidak |
| Peringatan duplikasi | Admin SDM | Tidak | Ya |

*Jam masih perlu dikonfirmasi.

**Format email:** subjek `[HCS] <Jenis Layanan> <Nomor Pengajuan> <status>`. Isi singkat berbahasa Indonesia baku dengan tautan ke HCS. Email tidak memuat nominal maupun lampiran.

## 9. Kebutuhan Non-Fungsional

### 9.1 Target kecepatan

| Aksi | Target |
|---|---|
| Membuka aplikasi pertama kali | ≤ 4 detik |
| Pindah menu, melihat riwayat, membuka detail | ≤ 1 detik |
| Mengirim pengajuan (yang dirasakan pengguna) | ≤ 1 detik |
| Mengunggah dokumen 5 MB (jaringan 4G) | ≤ 10 detik |
| Filter dan ekspor data oleh Admin | ≤ 3 detik |

### 9.2 Teknik menjaga kecepatan
1. Aplikasi satu halaman; hanya data yang diambil dari server.
2. Data dibaca dan ditulis per blok, tidak per sel.
3. Data master dan tarif disimpan di cache.
4. Tampilan optimistis: layar langsung menampilkan hasil, penyimpanan berjalan di latar belakang.
5. Email dikirim melalui antrean, bukan saat pengguna menekan tombol.
6. Pengajuan yang sudah lama dipindahkan ke spreadsheet arsip.
7. Seluruh perhitungan dilakukan di kode, bukan dengan rumus spreadsheet.
8. Penguncian (LockService) saat menulis data agar dua Admin tidak saling menimpa.

### 9.3 Keamanan dan keandalan
- Hanya akun pegadaian.co.id yang dapat mengakses.
- Spreadsheet dan folder dokumen tidak dibagikan kepada karyawan; semua akses melalui aplikasi.
- Layar terkunci otomatis setelah 15 menit tidak ada aktivitas.
- Backup otomatis setiap hari ke folder backup; backup disimpan 30 hari.
- Setiap perubahan status dan nilai dicatat di LogPerubahan.

### 9.4 Tampilan
Mengikuti Pegadaian Design System dan Design Brief v1.0: warna #fbc513 (gold), #75c044 (lime), #0da94d (green, warna aksi), #064e43 (forest, judul dan teks); huruf Ronnia (jika lisensi web tersedia, jika tidak memakai huruf cadangan yang serupa); Bahasa Indonesia baku, huruf kapital hanya di awal kalimat, tanpa emoji.

## 10. Batas Platform yang Diketahui

| Batas | Nilai | Dampak untuk HCS |
|---|---|---|
| Proses berjalan bersamaan | ±30 | Cukup; beban puncak diperkirakan 20–30 pengguna aktif |
| Durasi satu proses | 6 menit | Semua proses dirancang selesai dalam hitungan detik |
| Kirim email per hari | ±1.500 penerima | Kebutuhan diperkirakan di bawah 200 per hari |
| Kapasitas spreadsheet | 10 juta sel | Dijaga dengan pemisahan dan pengarsipan |
| Jeda dasar per permintaan ke server | ±0,3–1,5 detik | Diatasi dengan teknik pada Bagian 9.2 |

## 11. Tata Kelola (Level Wilayah)

1. HCS ditetapkan sebagai inisiatif resmi Kanwil IV melalui **nota dinas atau persetujuan tertulis Pemimpin Wilayah**.
2. Seluruh file, spreadsheet, dan kode dimiliki **akun unit SDM**, bukan akun pribadi.
3. Tersedia **dokumentasi serah terima** (PRD, Build Plan, panduan Admin) agar aplikasi dapat dirawat pihak lain.
4. Fungsi TI di tingkat wilayah (jika ada) cukup **diinformasikan**.

## 12. Pemicu Migrasi ke Jalur B (Server)

Migrasi ke PRD Versi Server dipertimbangkan jika **dua atau lebih** kondisi berikut terjadi:

| No | Kondisi | Cara mengukur |
|---|---|---|
| 1 | Aksi utama rata-rata lebih dari 3 detik selama 2 minggu berturut-turut | Log waktu proses di HCS_Log |
| 2 | Muncul error batas kuota atau antrean lebih dari 5 kali per minggu | Log error |
| 3 | Data aktif melebihi 50.000 baris atau 5 juta sel | Pemeriksaan otomatis bulanan |
| 4 | HCS diperluas ke Kanwil lain atau tingkat nasional | Keputusan manajemen |
| 5 | Keluhan kecepatan tertulis dari Admin atau karyawan berulang | Catatan Admin |

**Rencana migrasi:** karena struktur data sudah sama, data Sheets diekspor ke PostgreSQL dan dokumen Drive dipindahkan ke Cloud Storage. Aturan bisnis, alur, dan tampilan tidak berubah.

## 13. Rencana Pembangunan (Garis Besar)

| Tahap | Pekerjaan |
|---|---|
| 0 | **Uji kecepatan (POC):** 10.000 baris data dummy, tiga layar utama, pengukuran di HP dan laptop kantor |
| 1 | Persiapan: akun unit, clasp, Git, struktur folder proyek |
| 2 | Struktur spreadsheet dan data master |
| 3 | Login otomatis dan pengaturan peran |
| 4 | Klaim Perdin |
| 5 | Klaim Perdin Diklat |
| 6 | Permohonan SPPD dan Tugasku |
| 7 | Pemesanan Tiket Pesawat |
| 8 | Perhitungan SPPD otomatis |
| 9 | Deteksi duplikasi |
| 10 | Halaman Admin (cetak dan ekspor) |
| 11 | Notifikasi email, lonceng in-app, ringkasan harian |
| 12 | Backup, arsip, dan pemantauan pemicu migrasi |
| 13 | Penyempurnaan tampilan |

Rincian tiap tahap disusun dalam Build Plan Versi Workspace setelah PRD ini disetujui dan uji kecepatan selesai.

## 14. Pertanyaan Terbuka

1. Akun unit SDM mana yang dipakai sebagai pemilik aplikasi.
2. Jam pengiriman ringkasan harian Admin.
3. Sumber data master karyawan (NIK/nomor pegawai, JG, unit kerja) dan siapa yang memperbaruinya.
4. Ketersediaan lisensi web untuk huruf Ronnia.
