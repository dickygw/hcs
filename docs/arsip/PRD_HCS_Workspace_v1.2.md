# PRD — HCS (Human Capital System) Versi Google Workspace

| | |
|---|---|
| **Versi** | 1.2 (Draft) |
| **Tanggal** | 29-09-2026 |
| **Lingkup penggunaan** | Kantor Wilayah IV Balikpapan |
| **Platform** | Google Workspace Pegadaian (Apps Script, Sheets, Drive, Gmail) |
| **Dokumen terkait** | PRD HCS Versi Server v1.3 (jalur cadangan), Design Brief v1.0 |
| **Status** | Menunggu persetujuan |

### Riwayat versi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | 29-09-2026 | Draf awal jalur Google Workspace |
| 1.1 | 29-09-2026 | Data master karyawan dari HCMS dan sinkronisasi wajib; golongan mengikuti JG jabatan yang sedang dijalankan; penguncian data per pengajuan; data master TAD dengan saran nama dan rekening otomatis; pengajuan atas nama TAD oleh Admin; perlindungan data rekening |
| 1.2 | 29-09-2026 | TAD diinput oleh karyawan di dalam pengajuannya (bukan oleh Admin); input manual TAD yang belum terdaftar; karyawan hanya mengisi data fakta dan tidak melihat perhitungan; karyawan dapat melihat nominal yang disetujui setelah Selesai; tanggal akhir kontrak TAD opsional; tampilan Karyawan dan TAD dipisah |

---

## 1. Keputusan Arsitektur Dua Jalur

HCS memiliki dua PRD yang disimpan berdampingan:

| Jalur | Dokumen | Status |
|---|---|---|
| **Jalur A — Google Workspace** | Dokumen ini | **Dibangun sekarang** |
| **Jalur B — Server (Google Cloud)** | PRD HCS Versi Server v1.3 | **Cadangan**, diaktifkan jika pemicu migrasi terpenuhi (Bagian 13) |

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
- Karyawan dapat **melacak sendiri** posisi pengajuan dan nominal yang disetujui tanpa perlu bertanya ke Admin (transparansi).

## 4. Ruang Lingkup

**Termasuk:** Klaim Biaya Perdin, Klaim Biaya Perdin Diklat, Permohonan SPPD, Pemesanan Tiket Pesawat, untuk karyawan dan Tenaga Alih Daya (TAD) di lingkup Kanwil IV.

**Tidak termasuk:** proses transfer pembayaran, manajemen anggaran, persetujuan atasan berjenjang, dan klaim non-perjalanan (kacamata, kesehatan, dan sejenisnya).

## 5. Pengguna dan Subjek Pengajuan

### 5.1 Pengguna aplikasi

| Peran | Jumlah | Hak akses |
|---|---|---|
| **Karyawan** | 873 (data HCMS per 22-09-2026) | Mengajukan (termasuk menambahkan TAD yang tercantum di Surat Tugas), menyimpan draf, membatalkan sebelum diproses, mengedit dan mengirim ulang saat "Perlu revisi", melacak riwayat dan status pengajuan sendiri, melihat nominal yang disetujui setelah pengajuan Selesai |
| **Admin SDM** | 3–5 | Melihat semua pengajuan, mengubah status, meminta revisi atau menolak, mencetak dan mengekspor, mengelola inbox "Tugasku", **menghitung dan menyesuaikan SPPD**, memverifikasi TAD terhadap Surat Tugas, melengkapi rekening TAD yang belum terdaftar, **menyinkronkan data master** |

Peran ditentukan dari sheet **Pengguna** yang memetakan alamat email ke peran. Karyawan dikenali otomatis dari email pegadaian.co.id yang dicocokkan dengan data master karyawan.

### 5.2 Tenaga Alih Daya (TAD)
TAD **tidak login** ke HCS. TAD dimasukkan oleh **karyawan yang melakukan perjalanan dinas bersama TAD tersebut**, di dalam pengajuan karyawan itu sendiri, karena nama TAD tercantum di Surat Tugas yang diunggah (Bagian 6.7). Setiap TAD tercatat sebagai rincian tersendiri yang terhubung ke pengajuan karyawan induknya.

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

**Khusus TAD:** satu TAD hanya dapat diajukan **satu kali per Nomor Surat Tugas**. Jika karyawan lain dalam Surat Tugas yang sama mencoba menambahkan TAD yang sama, muncul pesan: *"TAD ini sudah diajukan dalam pengajuan [nomor]."* Aturan ini mencegah pembayaran ganda ketika satu Surat Tugas mencakup beberapa karyawan.

### 6.5 Perhitungan SPPD otomatis
Acuan utama: **SE 145 Tahun 2026** (Petunjuk Pelaksanaan Perjalanan Dinas), dengan dasar PerDir 39 Tahun 2026 dan PKB 2026–2028.

**Perhitungan adalah alat bantu Admin SDM.** Karyawan tidak dapat melihat tarif, rumus, maupun hasil perhitungan selama pengajuan diproses (lihat Bagian 6.8). Saat Admin membuka pengajuan, sistem menghitung otomatis dari data yang diisi karyawan, golongan yang terkunci, dan tabel tarif. Karyawan dan setiap TAD dihitung dalam rincian terpisah. Biaya at cost (hotel dan tiket) diisi Admin berdasarkan kuitansi yang diunggah.

**Penentuan golongan (PKB Pasal 52):**

| Golongan | Job Grade |
|---|---|
| A | JG 14 ke atas |
| B | JG 11 – 13 |
| C | JG 4 – 10 |
| TAD | Mengacu ke Golongan C dengan tarif 70% (SE 145) |

**JG yang dipakai adalah JG jabatan yang sedang dijalankan** (kolom KODE JOB GRADE pada HCMS), bukan JG definitif. Ketentuan ini berdampak pada karyawan berstatus Penugasan atau Masa Evaluasi; pada data 22-09-2026 terdapat 34 karyawan yang golongannya berbeda antara JG jabatan saat ini dan JG definitif.

Admin dapat mengisi **"JG untuk Perdin (koreksi manual)"** untuk kasus khusus, misalnya karyawan Masa Persiapan Pensiun yang JG-nya tercatat 0. Koreksi ini tercatat di log dan tidak tertimpa saat sinkronisasi.

**Uang harian perjalanan menginap (lumpsum per hari):**

| Komponen | Gol. A | Gol. B | Gol. C | TAD (70% Gol. C) |
|---|---|---|---|---|
| Transportasi lokal, uang makan, cuci pakaian | Rp520.000 | Rp410.000 | Rp300.000 | Rp210.000 |
| Transportasi ke/dari bandara, stasiun, terminal, pelabuhan (per sekali jalan) | Rp250.000 | Rp250.000 | Rp250.000 | Perlu dikonfirmasi* |

Jika menggunakan kendaraan dinas, uang harian menginap tetap dibayarkan 100%.

**Uang harian perjalanan tidak menginap (jarak lebih dari 30 km):**

| Jarak | Gol. A | Gol. B | Gol. C | TAD (70% Gol. C) |
|---|---|---|---|---|
| >30 – 60 km | Rp350.000 | Rp250.000 | Rp180.000 | Rp126.000 |
| >60 km | Rp380.000 | Rp270.000 | Rp200.000 | Rp140.000 |

Jika menggunakan kendaraan dinas, uang harian dibayarkan 50% dan transportasi ke/dari bandara/stasiun/terminal/pelabuhan tidak dibayarkan.

*SE 145 menyebut TAD menerima "70% dari uang harian Golongan C". Perlu konfirmasi apakah komponen transportasi ke/dari bandara ikut dikalikan 70% atau dibayar penuh.

**Ketentuan lain:**
- Penugasan lebih dari 12 hari dan menginap: bantuan sewa rumah per bulan Rp3.300.000 (A), Rp2.200.000 (B), Rp1.300.000 (C).
- Transportasi dan hotel dibayarkan sesuai biaya riil (at cost).
- Tarif disimpan di sheet **TarifSPPD** sehingga dapat diperbarui Admin tanpa mengubah kode.
- Admin dapat menyesuaikan hasil perhitungan; setiap penyesuaian dicatat (siapa, kapan, nilai lama → nilai baru).

### 6.6 Penguncian data per pengajuan
Saat pengajuan dikirim, data berikut **disalin dan dikunci** di dalam pengajuan tersebut: JG, golongan, jabatan, unit kerja, dan (khusus TAD) nomor rekening serta nama bank. Untuk TAD yang rekeningnya dilengkapi Admin kemudian, rekening dikunci saat Admin menyimpannya. Perubahan data master sesudahnya tidak mengubah pengajuan yang sudah dikirim, sehingga perhitungan dan pembayaran tetap sesuai kondisi saat perjalanan dinas dilakukan.

### 6.7 TAD dalam pengajuan karyawan
1. Di form pengajuan terdapat bagian terpisah **"TAD dalam Surat Tugas ini"**, berbeda judul dan penanda warnanya dari bagian data karyawan.
2. Karyawan mengetik minimal 3 huruf nama TAD. Saran menampilkan **nama, NIK, vendor, dan unit kerja** saja, **tanpa nomor rekening dalam bentuk apa pun**. Informasi ini cukup untuk membedakan TAD dengan nama sama.
3. Karyawan dapat menambahkan lebih dari satu TAD.
4. Jika TAD tidak ditemukan, karyawan memilih **"TAD belum terdaftar"** dan mengisi **nama (wajib)** serta NIK dan vendor (opsional). Sebelum disimpan, sistem menampilkan nama-nama yang mirip untuk mencegah data ganda karena beda ejaan.
5. **Karyawan tidak dapat mengisi, melihat, atau mengubah nomor rekening TAD.** Rekening diambil otomatis dari data master oleh sistem. Untuk TAD yang belum terdaftar, rekening dilengkapi Admin setelah verifikasi ke TAD atau vendor.
6. Sebelum mengirim, karyawan mencentang pernyataan: *"Data TAD yang saya tambahkan sesuai dengan Surat Tugas."*
7. Admin memverifikasi kecocokan nama TAD dengan Surat Tugas yang diunggah.
8. Pengajuan yang memuat TAD tanpa rekening diberi tanda **"Data rekening TAD belum lengkap"** dan **tidak dapat berstatus Selesai** sebelum rekening diisi.

### 6.8 Data yang diisi karyawan dan transparansi
**Prinsip: karyawan hanya mengisi fakta; Admin SDM yang menghitung.**

| Bagian | Isian karyawan |
|---|---|
| Surat tugas | Nomor Surat Tugas (atau Surat Pemanggilan untuk Diklat) dan unggahan dokumennya |
| Perjalanan | Kota/unit tujuan, tanggal berangkat, tanggal kembali |
| Jenis perjalanan | Menginap atau tidak menginap; jika tidak menginap, pilihan jarak >30–60 km atau >60 km |
| Transportasi | Moda (pesawat, kapal, kereta, darat) dan penggunaan kendaraan dinas |
| Bukti | Invoice/kuitansi hotel dan transportasi, formulir pengajuan |
| TAD | Nama TAD yang tercantum di Surat Tugas (Bagian 6.7) |

**Yang dapat dilihat karyawan:**

| Tahap | Terlihat oleh karyawan |
|---|---|
| Selama diproses | Status dan **riwayat status lengkap** (kapan dikirim, kapan diproses, oleh siapa, catatan revisi) |
| Setelah **Selesai** | **Nominal yang disetujui** per rincian (karyawan dan setiap TAD yang ia tambahkan) beserta totalnya |
| Tidak pernah | Tarif, rumus, dan hasil perhitungan sebelum Selesai; nomor rekening TAD |

## 7. Data Master

### 7.1 Data master karyawan (sumber: HCMS)
Sumber data adalah file ekspor HCMS (format "Adv") yang diunggah Admin. Dari 93 kolom pada file ekspor, **HCS hanya menyimpan 12 kolom**:

| Kolom HCMS | Kegunaan di HCS |
|---|---|
| NIK PENDEK | Nomor pegawai (kunci data) |
| NAMA | Nama karyawan |
| PRIM EMAIL | Kunci login |
| EMP TYPE NAME | Jenis karyawan |
| KODE JOB GRADE | Dasar golongan perjalanan dinas |
| JOB GRADE DEF | Informasi pendukung |
| POSITION TYPE NAME | Status posisi (Definitif, Penugasan, Masa Evaluasi) |
| POSITION NAME | Nama jabatan |
| KODE UNIT KERJA | Kode unit |
| NAMA UNIT KERJA | Nama unit |
| BRANCH NAME | Kantor cabang |
| DEP NAME | Kantor area / bidang |

**Kolom lain tidak pernah disimpan**, termasuk NIK KTP, KK, NPWP, BPJS, rekening bank, alamat, agama, tanggal lahir, nomor telepon, dan status pajak. Kolom tersebut dibuang saat proses unggah (prinsip minimisasi data sesuai UU Pelindungan Data Pribadi).

### 7.2 Sinkronisasi wajib data karyawan
1. Admin mengunggah file ekspor HCMS terbaru di menu **"Sinkronisasi Data Karyawan"** tanpa perlu mengolahnya terlebih dahulu.
2. HCS memeriksa kelengkapan kolom dan format; file yang tidak sesuai ditolak dengan pesan yang jelas.
3. HCS menampilkan **ringkasan perubahan** sebelum disimpan: karyawan baru, karyawan yang tidak lagi ada, perubahan JG (termasuk yang berubah golongan), dan perpindahan unit.
4. Admin meninjau rincian lalu menekan **"Terapkan"**.
5. Karyawan yang tidak ada lagi di file **dinonaktifkan, tidak dihapus**; riwayat pengajuannya tetap tersimpan.
6. Setiap sinkronisasi dicatat di **RiwayatSinkronisasi**: pengunggah, waktu, nama file, dan jumlah perubahan.

**Kewajiban dan pengingat:**
- Dashboard Admin menampilkan **"Data karyawan terakhir diperbarui X hari lalu"**: hijau (< 7 hari), kuning (7–14 hari), merah (> 14 hari).
- Email pengingat ke seluruh Admin setiap Senin, dan setiap hari jika data berumur lebih dari 7 hari.
- Saat data berstatus merah, Admin mendapat peringatan ketika memproses SPPD bahwa golongan mungkin tidak akurat.
- Karyawan **tidak diblokir** mengajukan meskipun data belum diperbarui.
- Email yang belum terdaftar melihat pesan: "Akun Anda belum terdaftar di HCS. Silakan hubungi Admin SDM."

### 7.3 Data master TAD
Sumber awal: file **GABUNGAN NO REKENING OUTSOURCING**, yang telah dirapikan Admin ke dalam Template Unggah TAD (1.346 TAD aktif; vendor POJ dan PKSS; seluruh rekening di BRI). Data TAD dikelola **terpisah** dari sinkronisasi HCMS sehingga tidak ikut terhapus atau dinonaktifkan saat data karyawan diperbarui.

**Kolom data TAD:** NIK, nama, nama bank, nomor rekening, vendor, unit kerja, tanggal akhir kontrak (**opsional**), sumber data (unggahan resmi / input manual).

**Cara pembaruan:** Admin mengunggah file sesuai Template Unggah TAD. Saat unggah, HCS:
- merapikan nomor rekening menjadi angka saja dan membuang spasi berlebih pada nama;
- menolak rekening BRI yang panjangnya bukan 15 digit;
- mengosongkan tanggal akhir kontrak yang tidak diketahui;
- menandai data ganda, NIK tidak valid, dan rekening kosong;
- menampilkan ringkasan perubahan sebelum Admin menekan "Terapkan".

**Status aktif:** mengikuti file unggahan terbaru. TAD yang tidak ada lagi di file terbaru **dinonaktifkan, tidak dihapus**. Tidak ada penonaktifan otomatis berdasarkan tanggal kontrak.

**TAD input manual:** TAD yang ditambahkan karyawan melalui "TAD belum terdaftar" masuk ke data master dengan label **"Input manual, belum terverifikasi"**, sehingga muncul di saran nama untuk pengajuan berikutnya. Label hilang setelah TAD tersebut muncul di file unggahan resmi.

**Kondisi data saat ini:** 17 baris pada template perlu diperbaiki sebelum impor pertama (3 rekening kosong, 8 rekening 14 digit yang kemungkinan kehilangan angka 0 di depan, 6 rekening 10 atau 13 digit). Kolom nomor rekening wajib berformat Text di Excel.

### 7.4 Perlindungan data rekening TAD
- Nomor rekening hanya dapat dilihat Admin SDM; di layar ditampilkan tersamar (••••1234). Karyawan tidak pernah melihat rekening TAD.
- Nomor lengkap hanya muncul pada cetakan atau ekspor untuk keperluan pembayaran.
- Setiap cetak/ekspor yang memuat nomor rekening lengkap dicatat di **LogAksesRekening** (siapa, kapan, pengajuan mana).
- Nomor rekening karyawan tetap **tidak** disimpan di HCS.

## 8. Arsitektur Teknis

| Komponen | Teknologi | Keterangan |
|---|---|---|
| Aplikasi | **Google Apps Script Web App** | Aplikasi satu halaman (dimuat sekali, pindah menu tanpa muat ulang) |
| Akun pemilik | **Akun unit SDM Kanwil IV** | Bukan akun pribadi, agar aplikasi tidak bergantung pada satu orang |
| Akses | Hanya akun **pegadaian.co.id** | Login otomatis memakai akun Google yang sedang aktif |
| Data | **Google Sheets** | Satu sheet per tabel, tanpa rumus |
| Dokumen | **Google Drive** | Folder milik akun unit, tidak dibagikan langsung ke pengguna |
| Email | **Gmail akun unit** (MailApp) | Dikirim melalui antrean |
| Tugas terjadwal | **Trigger Apps Script** | Antrean email, ringkasan harian, pengingat sinkronisasi, backup, arsip |
| Cache | **CacheService** | Data master, daftar TAD untuk saran nama, dan tarif |
| Pengembangan | **clasp + Git** di Google Antigravity | Kode dikelola di repo lokal lalu dikirim ke Apps Script |

### 8.1 Struktur data

| Spreadsheet | Sheet (tabel) |
|---|---|
| HCS_Data | Pengajuan, Dokumen, RiwayatStatus, Notifikasi |
| HCS_Master | Pengguna, Karyawan, TAD, TarifSPPD, JenisLayanan, RiwayatSinkronisasi |
| HCS_Log | LogPerubahan, LogAksesRekening, AntreanEmail, LogKinerja |
| HCS_Arsip_[tahun] | Pengajuan yang sudah Selesai/Ditolak lebih dari 90 hari |

Nama tabel dan kolom mengikuti skema database pada PRD Versi Server.

### 8.2 Penyimpanan dokumen
- Struktur folder: `HCS/Dokumen/[tahun]/[nomor pengajuan]/`.
- Dokumen hanya dapat dibuka melalui HCS oleh pemilik pengajuan dan Admin.
- Ukuran maksimal 5 MB per file (PDF, JPG, PNG). Foto otomatis diperkecil di perangkat sebelum diunggah.

## 9. Notifikasi

**Saluran:** email ke alamat pegadaian.co.id dan lonceng notifikasi di dalam aplikasi. TAD tidak menerima notifikasi; status rincian TAD disampaikan kepada karyawan yang mengajukan.

| Kejadian | Penerima | Email | In-app |
|---|---|---|---|
| Pengajuan berhasil dikirim | Karyawan | Ya | Ya |
| Pengajuan diminta revisi | Karyawan | Ya | Ya |
| Pengajuan selesai (beserta tautan untuk melihat nominal yang disetujui) | Karyawan | Ya | Ya |
| Pengajuan ditolak (beserta alasan) | Karyawan | Ya | Ya |
| Status berubah menjadi Diproses | Karyawan | Tidak | Ya |
| Pengajuan baru masuk Tugasku | Admin SDM | Tidak | Ya |
| Ringkasan harian isi Tugasku | Admin SDM | Ya, hari kerja pukul 07.00 WITA* | Tidak |
| Peringatan duplikasi | Admin SDM | Tidak | Ya |
| Pengingat sinkronisasi data karyawan | Admin SDM | Ya (Senin; harian jika > 7 hari) | Ya |
| Pengajuan memuat TAD belum terdaftar / rekening TAD belum lengkap | Admin SDM | Ya (masuk ringkasan harian) | Ya |

*Jam masih perlu dikonfirmasi.

**Format email:** subjek `[HCS] <Jenis Layanan> <Nomor Pengajuan> <status>`. Isi singkat berbahasa Indonesia baku dengan tautan ke HCS. Email tidak memuat nominal, nomor rekening, maupun lampiran.

## 10. Kebutuhan Non-Fungsional

### 10.1 Target kecepatan

| Aksi | Target |
|---|---|
| Membuka aplikasi pertama kali | ≤ 4 detik |
| Pindah menu, melihat riwayat, membuka detail | ≤ 1 detik |
| Mengirim pengajuan (yang dirasakan pengguna) | ≤ 1 detik |
| Saran nama TAD muncul setelah mengetik | ≤ 0,5 detik |
| Mengunggah dokumen 5 MB (jaringan 4G) | ≤ 10 detik |
| Filter dan ekspor data oleh Admin | ≤ 3 detik |
| Sinkronisasi file HCMS (±900 baris) sampai ringkasan tampil | ≤ 30 detik |

### 10.2 Teknik menjaga kecepatan
1. Aplikasi satu halaman; hanya data yang diambil dari server.
2. Data dibaca dan ditulis per blok, tidak per sel.
3. Data master, daftar TAD, dan tarif disimpan di cache. Saran nama TAD dicari langsung di perangkat pengguna tanpa menunggu server; daftar yang dikirim ke perangkat karyawan **hanya berisi nama, NIK, vendor, dan unit, tanpa rekening**.
4. Tampilan optimistis: layar langsung menampilkan hasil, penyimpanan berjalan di latar belakang.
5. Email dikirim melalui antrean, bukan saat pengguna menekan tombol.
6. Pengajuan yang sudah lama dipindahkan ke spreadsheet arsip.
7. Seluruh perhitungan dilakukan di kode, bukan dengan rumus spreadsheet.
8. Penguncian (LockService) saat menulis data agar dua Admin tidak saling menimpa.
9. Waktu setiap aksi utama dicatat di LogKinerja sebagai dasar keputusan migrasi.

### 10.3 Keamanan dan keandalan
- Hanya akun pegadaian.co.id yang dapat mengakses.
- Spreadsheet dan folder dokumen tidak dibagikan kepada karyawan; semua akses melalui aplikasi.
- Minimisasi data sesuai Bagian 7.1 dan perlindungan rekening sesuai Bagian 7.4.
- Layar terkunci otomatis setelah 15 menit tidak ada aktivitas.
- Backup otomatis setiap hari ke folder backup; backup disimpan 30 hari.
- Setiap perubahan status, nilai, koreksi JG, dan sinkronisasi dicatat.

### 10.4 Tampilan
Mengikuti Pegadaian Design System dan Design Brief v1.0: warna #fbc513 (gold), #75c044 (lime), #0da94d (green, warna aksi), #064e43 (forest, judul dan teks); huruf Ronnia (jika lisensi web tersedia, jika tidak memakai huruf cadangan yang serupa); Bahasa Indonesia baku, huruf kapital hanya di awal kalimat, tanpa emoji.

## 11. Batas Platform yang Diketahui

| Batas | Nilai | Dampak untuk HCS |
|---|---|---|
| Proses berjalan bersamaan | ±30 | Cukup; beban puncak diperkirakan 20–30 pengguna aktif |
| Durasi satu proses | 6 menit | Semua proses dirancang selesai dalam hitungan detik; sinkronisasi dipecah per blok |
| Kirim email per hari | ±1.500 penerima | Kebutuhan diperkirakan di bawah 200 per hari |
| Kapasitas spreadsheet | 10 juta sel | Dijaga dengan pemisahan dan pengarsipan |
| Jeda dasar per permintaan ke server | ±0,3–1,5 detik | Diatasi dengan teknik pada Bagian 10.2 |

## 12. Tata Kelola (Level Wilayah)

1. HCS ditetapkan sebagai inisiatif resmi Kanwil IV melalui **nota dinas atau persetujuan tertulis Pemimpin Wilayah**.
2. Seluruh file, spreadsheet, dan kode dimiliki **akun unit SDM**, bukan akun pribadi.
3. Tersedia **dokumentasi serah terima** (PRD, Build Plan, panduan Admin) agar aplikasi dapat dirawat pihak lain.
4. Fungsi TI di tingkat wilayah (jika ada) cukup **diinformasikan**.

## 13. Pemicu Migrasi ke Jalur B (Server)

Migrasi ke PRD Versi Server dipertimbangkan jika **dua atau lebih** kondisi berikut terjadi:

| No | Kondisi | Cara mengukur |
|---|---|---|
| 1 | Aksi utama rata-rata lebih dari 3 detik selama 2 minggu berturut-turut | LogKinerja |
| 2 | Muncul error batas kuota atau antrean lebih dari 5 kali per minggu | Log error |
| 3 | Data aktif melebihi 50.000 baris atau 5 juta sel | Pemeriksaan otomatis bulanan |
| 4 | HCS diperluas ke Kanwil lain atau tingkat nasional | Keputusan manajemen |
| 5 | Keluhan kecepatan tertulis dari Admin atau karyawan berulang | Catatan Admin |

**Rencana migrasi:** karena struktur data sudah sama, data Sheets diekspor ke PostgreSQL dan dokumen Drive dipindahkan ke Cloud Storage. Aturan bisnis, alur, dan tampilan tidak berubah.

## 14. Rencana Pembangunan (Garis Besar)

| Tahap | Pekerjaan |
|---|---|
| 0 | **Uji kecepatan (POC):** 10.000 baris data dummy, tiga layar utama, pengukuran di HP dan laptop kantor |
| 1 | Persiapan: akun unit, clasp, Git, struktur folder proyek |
| 2 | Struktur spreadsheet dan data master (Karyawan, TAD, TarifSPPD) |
| 3 | Sinkronisasi HCMS, unggah data TAD, dan pengingat pembaruan |
| 4 | Login otomatis dan pengaturan peran |
| 5 | Klaim Perdin (termasuk bagian TAD dalam pengajuan karyawan) |
| 6 | Klaim Perdin Diklat |
| 7 | Permohonan SPPD dan Tugasku |
| 8 | Pemesanan Tiket Pesawat |
| 9 | Perhitungan SPPD otomatis di sisi Admin, penguncian data, dan tampilan nominal setelah Selesai |
| 10 | Deteksi duplikasi |
| 11 | Halaman Admin (cetak, ekspor, log akses rekening) |
| 12 | Notifikasi email, lonceng in-app, ringkasan harian |
| 13 | Backup, arsip, dan pemantauan pemicu migrasi |
| 14 | Penyempurnaan tampilan |

Rincian tiap tahap disusun dalam Build Plan Versi Workspace setelah PRD ini disetujui dan uji kecepatan selesai.

## 15. Pertanyaan Terbuka

1. Akun unit SDM mana yang dipakai sebagai pemilik aplikasi.
2. Jam pengiriman ringkasan harian Admin.
3. Ketersediaan lisensi web untuk huruf Ronnia.
4. Apakah transportasi ke/dari bandara untuk TAD dibayar penuh atau 70%.
5. Apakah TAD vendor EPS (237 orang) dan INHOUSE (1 orang) yang tidak masuk template memang di luar lingkup Kanwil IV.
6. Perbaikan 17 baris rekening TAD sebelum impor pertama.

**Terjawab di v1.2:** seluruh rekening TAD berada di BRI; tanggal akhir kontrak TAD tidak tersedia sehingga dibuat opsional.
