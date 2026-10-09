# PRD — HCS (Human Capital System)

| | |
|---|---|
| **Versi** | 2.2 (Disetujui) |
| **Tanggal** | 09-10-2026 |
| **Lingkup penggunaan** | Kantor Wilayah IV Balikpapan |
| **Arsitektur** | **Google Workspace Pegadaian**: Apps Script Web App, Google Sheets, Google Drive, MailApp |
| **Dokumen terkait** | Standar Keamanan HCS v1.3 (wajib, sedang disusun), Design Brief v1.1, Mockup Claude Design di folder `mockup/` (acuan visual utama) |
| **Status** | **Disetujui** pemilik proyek, 09-10-2026 |

### Riwayat versi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | 26-09-2026 | PRD awal (Next.js, Express, PostgreSQL) |
| 1.1–1.3 (Server), 1.0–1.2 (Workspace) | 29-09-2026 | Dua jalur arsitektur; aturan data master, TAD, dan transparansi |
| 2.0 | 06-10-2026 | Konsolidasi menjadi satu PRD; hosting Cloudways Velocity + Supabase; Pulse Check Fase 2 |
| 2.1 | 07-10-2026 | Jawaban pertanyaan terbuka (akun admin sistem, ringkasan 08.00 WITA, Ronnia, transport bandara TAD 70%, TAD EPS dan INHOUSE) |
| **2.2** | 09-10-2026 | Teknik kecepatan Apps Script dirinci di 9.1 (satu kali baca, halaman per 20 baris, satu panggilan per layar, cache server dan browser). **Arsitektur diganti ke Google Workspace Pegadaian** (Apps Script, Sheets, Drive) mengikuti keputusan IT Security pusat: aplikasi dan data tidak boleh keluar dari lingkungan Workspace Pegadaian. **Aturan bisnis (bagian 1–6) dan notifikasi (bagian 8) tidak berubah.** Login ditangani Google (layar U1 tidak dipakai). Biaya operasional Rp0. |

PRD ini **menggantikan** PRD v2.1. Arsitektur di bawah mengambil bahan dari arsip PRD Workspace v1.2, disesuaikan dengan Standar Keamanan.

---

## 1. Latar Belakang Masalah

- Karyawan bingung cara mengajukan hak klaim: Klaim Biaya Perdin, Klaim Biaya Perdin Diklat, Permohonan SPPD, dan Pemesanan Tiket Pesawat.
- Pengajuan masuk melalui empat saluran: formulir kertas, email, WhatsApp, dan aplikasi E-Office.
- Admin SDM harus memeriksa semua saluran setiap pagi.
- Sering terjadi pembayaran ganda karena pengajuan yang sama dikirim lewat email dan WhatsApp.
- Admin sulit melacak sejauh mana setiap pengajuan diproses.
- Dokumen cetak mudah hilang dan tidak tersimpan rapi.

## 2. Sasaran dan Ukuran Keberhasilan

- SLA pembayaran klaim lebih cepat **40%**.
- Waktu pemeriksaan harian Admin turun menjadi **10 menit per hari**.
- Seluruh pengajuan masuk melalui **satu pintu** (HCS).
- Karyawan dapat **melacak sendiri** posisi pengajuan dan nominal yang disetujui (transparansi).

## 3. Ruang Lingkup dan Fase

| Fase | Isi |
|---|---|
| **Fase 1** | Klaim Biaya Perdin, Klaim Biaya Perdin Diklat, Permohonan SPPD, Pemesanan Tiket Pesawat, untuk karyawan dan TAD di lingkup Kanwil IV |
| **Fase 2** | Pulse Check Karyawan. Konsep disusun terpisah dan disetujui sebelum dibangun. Arsitektur Fase 1 disiapkan agar Fase 2 dapat ditambahkan tanpa membongkar. |

**Tidak termasuk:** proses transfer pembayaran, manajemen anggaran, persetujuan atasan berjenjang, dan klaim non-perjalanan (kacamata, kesehatan, dan sejenisnya).

## 4. Pengguna dan Subjek Pengajuan

### 4.1 Pengguna aplikasi

| Peran | Jumlah | Hak akses |
|---|---|---|
| **Karyawan** | 873 (data HCMS per 22-09-2026) | Mengajukan (termasuk menambahkan TAD yang tercantum di Surat Tugas), menyimpan draf, membatalkan sebelum diproses, mengedit dan mengirim ulang saat "Perlu revisi", melacak riwayat dan status pengajuan sendiri, melihat nominal yang disetujui setelah Selesai |
| **Admin SDM** | 3–5 | Melihat semua pengajuan, mengubah status, meminta revisi atau menolak, mencetak dan mengekspor, mengelola inbox "Tugasku", menghitung dan menyesuaikan SPPD, memverifikasi TAD terhadap Surat Tugas, melengkapi rekening TAD yang belum terdaftar, menyinkronkan data master |

### 4.2 Tenaga Alih Daya (TAD)
TAD **tidak login** ke HCS. TAD dimasukkan oleh **karyawan yang melakukan perjalanan dinas bersama TAD tersebut**, di dalam pengajuan karyawan itu sendiri, karena nama TAD tercantum di Surat Tugas yang diunggah. Setiap TAD tercatat sebagai rincian tersendiri yang terhubung ke pengajuan induknya.

## 5. Aturan Bisnis

### 5.1 Alur layanan
- **Nomor Surat Tugas** menghubungkan Permohonan SPPD → Pemesanan Tiket Pesawat → Klaim Perdin sebagai satu alur. Satu Surat Tugas dapat mencakup beberapa karyawan.
- Klaim Perdin Diklat menggunakan **Nomor Surat Pemanggilan Workshop/Diklat**.
- Setiap Permohonan SPPD dan Pemesanan Tiket otomatis masuk ke **Tugasku** Admin.

### 5.2 Status pengajuan
`Draf → Dikirim → Diproses → Selesai / Ditolak`
Jika diminta revisi: `Perlu revisi → diedit → Dikirim ulang` (nomor pengajuan tetap sama).

### 5.3 Dokumen wajib
Surat Tugas atau Surat Pemanggilan, Invoice/Kuitansi, dan Formulir Pengajuan.

### 5.4 Deteksi duplikasi
- Pengajuan aktif dengan kombinasi **Nomor Surat Tugas + karyawan + jenis layanan** yang sama memicu **peringatan** ke Admin (tidak diblokir otomatis).
- **Khusus TAD:** satu TAD hanya dapat diajukan **satu kali per Nomor Surat Tugas**. Jika karyawan lain mencoba menambahkan TAD yang sama, muncul pesan: *"TAD ini sudah diajukan dalam pengajuan [nomor]."*

### 5.5 Perhitungan SPPD
Acuan utama: **SE 145 Tahun 2026**, dengan dasar PerDir 39 Tahun 2026 dan PKB 2026–2028.

**Perhitungan adalah alat bantu Admin SDM.** Karyawan tidak melihat tarif, rumus, maupun hasil perhitungan selama pengajuan diproses. Sistem menghitung otomatis saat Admin membuka pengajuan; karyawan dan setiap TAD dihitung terpisah. Biaya at cost (hotel dan tiket) diisi Admin berdasarkan kuitansi.

**Golongan (PKB Pasal 52)**, berdasarkan **JG jabatan yang sedang dijalankan** (kolom KODE JOB GRADE HCMS), bukan JG definitif:

| Golongan | Job Grade |
|---|---|
| A | JG 14 ke atas |
| B | JG 11 – 13 |
| C | JG 4 – 10 |
| TAD | 70% dari seluruh komponen uang harian Golongan C, termasuk transportasi bandara (SE 145, dikonfirmasi Admin SDM) |

Admin dapat mengisi **JG untuk Perdin (koreksi manual)** untuk kasus khusus (mis. Masa Persiapan Pensiun dengan JG tercatat 0). Koreksi tercatat di log dan tidak tertimpa sinkronisasi.

**Uang harian menginap (per hari):**

| Komponen | Gol. A | Gol. B | Gol. C | TAD |
|---|---|---|---|---|
| Transportasi lokal, uang makan, cuci pakaian | Rp520.000 | Rp410.000 | Rp300.000 | Rp210.000 |
| Transportasi ke/dari bandara, stasiun, terminal, pelabuhan (per sekali jalan) | Rp250.000 | Rp250.000 | Rp250.000 | Rp175.000 |

Menggunakan kendaraan dinas: uang harian menginap tetap 100%.

**Uang harian tidak menginap (jarak > 30 km):**

| Jarak | Gol. A | Gol. B | Gol. C | TAD |
|---|---|---|---|---|
| >30 – 60 km | Rp350.000 | Rp250.000 | Rp180.000 | Rp126.000 |
| >60 km | Rp380.000 | Rp270.000 | Rp200.000 | Rp140.000 |

Menggunakan kendaraan dinas: uang harian 50% dan transportasi bandara/stasiun/terminal/pelabuhan tidak dibayarkan.

**Ketentuan lain:** bantuan sewa rumah untuk penugasan > 12 hari dan menginap (Rp3.300.000 / Rp2.200.000 / Rp1.300.000 per bulan untuk A/B/C); transportasi dan hotel at cost; tarif disimpan di tabel **tarif_sppd** (sheet) agar dapat diperbarui Admin tanpa mengubah kode; setiap penyesuaian Admin dicatat.

### 5.6 Penguncian data per pengajuan
Saat pengajuan dikirim, JG, golongan, jabatan, unit kerja, dan (khusus TAD) bank serta nomor rekening **disalin dan dikunci** di pengajuan. Rekening TAD yang dilengkapi Admin kemudian dikunci saat Admin menyimpannya.

### 5.7 TAD dalam pengajuan karyawan
1. Bagian terpisah **"TAD dalam Surat Tugas ini"**, berbeda judul dan penanda warna dari data karyawan.
2. Karyawan mengetik minimal 3 huruf; saran menampilkan **nama, NIK, vendor, unit** saja, **tanpa rekening dalam bentuk apa pun**.
3. Dapat menambahkan lebih dari satu TAD.
4. Jika tidak ditemukan: **"TAD belum terdaftar"** → isi nama (wajib), NIK dan vendor (opsional). Sistem menampilkan nama-nama mirip sebelum menyimpan.
5. **Karyawan tidak dapat mengisi, melihat, atau mengubah rekening TAD.** Rekening diambil otomatis dari data master; untuk TAD belum terdaftar, dilengkapi Admin setelah verifikasi.
6. Karyawan mencentang pernyataan: *"Data TAD yang saya tambahkan sesuai dengan Surat Tugas."*
7. Admin memverifikasi kecocokan dengan Surat Tugas.
8. Pengajuan dengan TAD tanpa rekening bertanda **"Data rekening TAD belum lengkap"** dan **tidak dapat berstatus Selesai**.

### 5.8 Isian karyawan dan transparansi
**Prinsip: karyawan hanya mengisi fakta; Admin SDM yang menghitung.**

| Bagian | Isian karyawan |
|---|---|
| Surat tugas | Nomor Surat Tugas/Surat Pemanggilan dan unggahan dokumennya |
| Perjalanan | Kota/unit tujuan, tanggal berangkat, tanggal kembali |
| Jenis perjalanan | Menginap atau tidak; jika tidak menginap, jarak >30–60 km atau >60 km |
| Transportasi | Moda (pesawat, kapal, kereta, darat) dan penggunaan kendaraan dinas |
| Bukti | Invoice/kuitansi hotel dan transportasi, formulir pengajuan |
| TAD | Nama TAD yang tercantum di Surat Tugas |

| Tahap | Terlihat oleh karyawan |
|---|---|
| Selama diproses | Status dan riwayat status lengkap (waktu, pemroses, catatan revisi) |
| Setelah Selesai | Nominal yang disetujui per rincian (karyawan dan setiap TAD yang ia tambahkan) beserta total |
| Tidak pernah | Tarif, rumus, hasil perhitungan sebelum Selesai; nomor rekening TAD |

## 6. Data Master

### 6.1 Karyawan (sumber: ekspor HCMS)
Dari 93 kolom ekspor HCMS, **hanya 12 kolom disimpan**: NIK PENDEK, NAMA, PRIM EMAIL, EMP TYPE NAME, KODE JOB GRADE, JOB GRADE DEF, POSITION TYPE NAME, POSITION NAME, KODE UNIT KERJA, NAMA UNIT KERJA, BRANCH NAME, DEP NAME. Kolom lain (NIK KTP, KK, NPWP, BPJS, rekening, alamat, agama, tanggal lahir, telepon, status pajak) **dibuang saat unggah dan tidak pernah disimpan**.

### 6.2 Sinkronisasi wajib
1. Admin mengunggah ekspor HCMS terbaru di menu **"Sinkronisasi Data Karyawan"** tanpa diolah.
2. Sistem memeriksa kolom dan format; file tidak sesuai ditolak dengan pesan jelas.
3. Sistem menampilkan **ringkasan perubahan** (baru, tidak ada lagi, perubahan JG dan golongan, pindah unit) sebelum disimpan.
4. Admin menekan **"Terapkan"**.
5. Karyawan yang tidak ada lagi **dinonaktifkan, tidak dihapus**.
6. Setiap sinkronisasi dicatat (pengunggah, waktu, nama file, jumlah perubahan).

**Kewajiban:** indikator umur data di dashboard Admin (hijau < 7 hari, kuning 7–14, merah > 14); email pengingat setiap Senin dan harian jika > 7 hari; peringatan saat memproses SPPD dengan data merah; karyawan tidak diblokir; email belum terdaftar melihat pesan "Akun Anda belum terdaftar di HCS. Silakan hubungi Admin SDM."

### 6.3 TAD
- Sumber: Template Unggah TAD (vendor POJ, PKSS, EPS, dan INHOUSE; seluruh rekening BRI). Dikelola **terpisah** dari sinkronisasi HCMS.
- Kolom: NIK, nama, nama bank, nomor rekening (terenkripsi), vendor, unit kerja, tanggal akhir kontrak (**opsional**), sumber data (unggahan/input manual), status verifikasi.
- Unggahan: merapikan rekening menjadi angka, menolak rekening BRI yang bukan 15 digit, mengosongkan tanggal kontrak yang tidak diketahui, menandai data ganda/NIK tidak valid/rekening kosong, ringkasan sebelum "Terapkan".
- Status aktif mengikuti unggahan terbaru; TAD yang hilang dari file **dinonaktifkan, tidak dihapus**.
- TAD input manual masuk data master berlabel **"Input manual, belum terverifikasi"**.
- **Kondisi saat ini:** rekening bermasalah sudah diperbaiki; TAD vendor EPS dan INHOUSE sedang ditambahkan ke template. Template final divalidasi ulang sebelum impor pertama.

### 6.4 Perlindungan rekening TAD
Hanya Admin yang dapat melihat rekening (tampil tersamar ••••1234; lengkap hanya di cetakan/ekspor pembayaran). Setiap cetak/ekspor dengan rekening lengkap dicatat. Rekening karyawan tetap **tidak** disimpan.

## 7. Arsitektur Teknis

| Komponen | Teknologi | Keterangan |
|---|---|---|
| Aplikasi | **Google Apps Script Web App** | Aplikasi satu halaman (dimuat sekali, pindah menu tanpa muat ulang); tampilan mengikuti mockup |
| Akun pemilik | **Akun unit `manohc.balikpapan@pegadaian.co.id`** | Pemilik kode, spreadsheet, folder dokumen, dan pengirim email. Bukan akun kerja Admin |
| Penerapan (deploy) | Dijalankan sebagai **akun pemilik**, akses **hanya pengguna domain pegadaian.co.id** | Pengguna tidak pernah mendapat akses langsung ke spreadsheet atau folder |
| Login | **Otomatis oleh Google Workspace** | Identitas dibaca dari akun Google yang sedang aktif; akun di luar Pegadaian ditolak Google sebelum HCS terbuka |
| Data | **Google Sheets** | Satu sheet per tabel, tanpa rumus; dibaca dan ditulis per blok |
| Dokumen | **Google Drive** | Folder privat milik akun unit; file dibuka hanya melalui HCS |
| Email | **MailApp** dari akun unit | Melalui antrean |
| Tugas terjadwal | **Trigger Apps Script** | Antrean email, ringkasan harian, pengingat sinkronisasi, backup, arsip |
| Cache | **CacheService** | Data master, daftar TAD untuk saran nama, tarif |
| Rahasia | **Script Properties** | Kunci enkripsi rekening; tidak pernah di kode atau Git |
| Kode | **GitHub privat** + **clasp** | Kode dikelola di laptop (`D:\HCS`), dikirim ke Apps Script dengan clasp |
| Lingkungan | **Dua proyek terpisah: `HCS-dev` dan `HCS-prod`** | Dev memakai spreadsheet dan folder berisi data dummy; prod memakai data asli. Agen AI hanya bekerja di dev |

**Prinsip:** pengguna (termasuk Admin SDM) **tidak pernah** membuka spreadsheet atau folder dokumen secara langsung. Semua akses melalui fungsi server HCS yang memeriksa identitas, peran, dan kepemilikan data di setiap panggilan (Standar Keamanan v1.3). File data hanya dimiliki akun unit dan tidak dibagikan.

### 7.1 Struktur data

Nama tabel dan kolom **sama dengan PRD v2.1**, agar dapat dipindahkan ke database bila kelak diperlukan.

| Spreadsheet | Sheet (tabel) |
|---|---|
| `HCS_Master` | `pengguna`, `karyawan`, `tad`, `tarif_sppd`, `jenis_layanan`, `riwayat_sinkronisasi` |
| `HCS_Data` | `pengajuan`, `pengajuan_tad`, `dokumen`, `riwayat_status`, `notifikasi` |
| `HCS_Log` | `log_perubahan`, `log_akses_rekening`, `antrean_email`, `log_kinerja` |
| `HCS_Arsip_[tahun]` | Pengajuan Selesai/Ditolak lebih dari 90 hari |

| Tabel | Isi |
|---|---|
| `pengguna` | Email, peran (Karyawan/Admin), status aktif |
| `karyawan` | 12 kolom HCMS + `jg_perdin_override`, status aktif, waktu pembaruan |
| `tad` | NIK, nama, bank, rekening (terenkripsi), vendor, unit, tgl akhir kontrak (opsional), sumber data, terverifikasi, aktif |
| `tarif_sppd` | Tarif per golongan dan komponen, masa berlaku |
| `jenis_layanan` | Empat layanan Fase 1 |
| `pengajuan` | Data pengajuan, salinan JG/golongan/jabatan/unit, status, pernyataan TAD, nominal disetujui |
| `pengajuan_tad` | Rincian TAD per pengajuan, salinan bank/rekening (terenkripsi), nominal, status rekening; satu TAD hanya sekali per `no_surat_tugas` (dijaga dengan penguncian saat menulis) |
| `dokumen` | Metadata file di Drive (ID file, nama asli, jenis, ukuran, pemilik) |
| `riwayat_status` | Setiap perubahan status, oleh siapa, kapan, catatan |
| `notifikasi` | Lonceng in-app |
| `antrean_email` | Email yang menunggu dikirim |
| `log_perubahan` | Penyesuaian nominal, koreksi JG, perubahan data |
| `log_akses_rekening` | Cetak/ekspor dengan rekening lengkap |
| `log_kinerja` | Waktu setiap aksi utama (dasar pemantauan kecepatan) |
| `riwayat_sinkronisasi` | Sinkronisasi HCMS dan unggahan TAD |

### 7.2 Dokumen
- Struktur folder: `HCS/Dokumen/[tahun]/[nomor pengajuan]/`, nama file acak; nama asli hanya disimpan sebagai data.
- Hanya PDF, JPG, PNG, maksimal 5 MB per file; jenis file diperiksa dari isinya. Foto diperkecil di perangkat sebelum diunggah.
- File tidak pernah dibagikan (tidak ada tautan "siapa saja yang memiliki link"); pemilik pengajuan dan Admin membukanya melalui HCS.

### 7.3 Identitas, peran, dan kunci layar
- Peran ditentukan dari tabel `pengguna` dan data master `karyawan`, diperiksa di **setiap** panggilan fungsi server.
- Email yang tidak terdaftar atau nonaktif melihat layar **U2 Akun belum terdaftar**.
- HCS mengunci layar setelah **15 menit tanpa aktivitas** (dicatat di server). Pengguna menekan **Masuk kembali** untuk melanjutkan (layar U3); draf tetap tersimpan.
- Layar **U1 Masuk** dan **U1 error domain** di mockup **tidak dipakai**: login dan penolakan akun di luar Pegadaian ditangani Google.

## 8. Notifikasi

Saluran: email ke alamat pegadaian.co.id (dikirim dari **akun unit** melalui MailApp, lewat antrean) dan lonceng in-app. TAD tidak menerima notifikasi.

| Kejadian | Penerima | Email | In-app |
|---|---|---|---|
| Pengajuan berhasil dikirim | Karyawan | Ya | Ya |
| Pengajuan diminta revisi | Karyawan | Ya | Ya |
| Pengajuan selesai (tautan melihat nominal) | Karyawan | Ya | Ya |
| Pengajuan ditolak (beserta alasan) | Karyawan | Ya | Ya |
| Status berubah menjadi Diproses | Karyawan | Tidak | Ya |
| Pengajuan baru masuk Tugasku | Admin | Tidak | Ya |
| Ringkasan harian Tugasku | Admin | Ya, hari kerja 08.00 WITA* | Tidak |
| Peringatan duplikasi | Admin | Tidak | Ya |
| Pengingat sinkronisasi data karyawan | Admin | Ya | Ya |
| TAD belum terdaftar / rekening TAD belum lengkap | Admin | Ya (ringkasan harian) | Ya |

*Jam dapat diubah di pengaturan Admin. Format subjek: `[HCS] <Jenis Layanan> <Nomor Pengajuan> <status>`. Email tidak memuat nominal, rekening, maupun lampiran.

## 9. Kebutuhan Non-Fungsional

### 9.1 Kecepatan

Target disesuaikan dengan karakter Apps Script (setiap panggilan ke server ±0,3–1,5 detik) dan **wajib dibuktikan lewat uji kecepatan sebelum pembangunan penuh** (spesifikasi di arsip `SPEC_UJI_KECEPATAN_HCS.md`, diperbarui di Build Plan v3.0).

| Aksi | Target (p75) |
|---|---|
| Membuka aplikasi pertama kali | ≤ 4 detik |
| Pindah menu, riwayat, detail | ≤ 1 detik |
| Mengirim pengajuan | ≤ 1 detik (dirasakan) |
| Saran nama TAD | ≤ 0,5 detik (dicari di perangkat) |
| Unggah dokumen 5 MB (4G) | ≤ 10 detik |
| Filter dan ekspor Admin | ≤ 3 detik |
| Buka detail + hitung SPPD (Admin) | ≤ 1 detik |
| 20 pengguna bersamaan | Tanpa error |

**Teknik wajib agar Apps Script tidak lambat:**

| # | Teknik | Penerapan di HCS |
|---|---|---|
| 1 | **Satu kali baca, olah di memori** | Satu sheet dibaca sekaligus dengan `getDataRange().getValues()` (satu akses ke Google Sheets), lalu dicari, disaring, dan dihitung dengan loop di memori. Dilarang membaca atau menulis per sel (`getValue`/`setValue` di dalam loop). Penulisan juga sekaligus dengan `setValues()`. |
| 2 | **Hanya kirim data yang diperlukan** | Daftar (Pengajuan saya, Tugasku, Semua pengajuan, log) dikirim **per halaman** (mis. 20 baris, tombol "Muat lebih banyak") dan hanya kolom yang dibutuhkan layar. Sheet log yang terus bertambah dibaca dari baris terakhir saja, bukan seluruhnya. Pengajuan Selesai/Ditolak > 90 hari dipindah ke arsip agar sheet aktif tetap kecil. |
| 3 | **Sedikit panggilan ke server** | Satu layar dimuat dengan **satu panggilan** yang mengembalikan semua data layar itu (mis. detail + riwayat status + daftar dokumen sekaligus), bukan beberapa panggilan berurutan. |
| 4 | **Cache di server** | Data master, tarif, dan daftar TAD (tanpa rekening) disimpan di CacheService; dibaca ulang dari sheet hanya bila cache kosong atau data master berubah. |
| 5 | **Cache di browser** | Data yang sudah diambil disimpan di memori halaman, sehingga kembali ke layar sebelumnya tidak memanggil server lagi; diperbarui di latar belakang setelah aksi yang mengubah data. Daftar TAD untuk saran nama dikirim sekali, lalu dicari di perangkat. Aturan keamanannya di Standar Keamanan WEB-06. |
| 6 | **Tampilan optimistis** | Saat kirim pengajuan dan ubah status, layar langsung menampilkan hasil; penyimpanan berjalan di latar belakang dan dibatalkan dengan pesan bila gagal. |
| 7 | **Kerja berat di latar belakang** | Email lewat antrean dan trigger; tanpa rumus spreadsheet (semua perhitungan di kode); LockService hanya sesingkat proses tulis. |
| 8 | **Diukur** | Waktu setiap aksi utama dicatat di `log_kinerja`. |

### 9.2 Batas platform

| Batas | Nilai | Dampak untuk HCS |
|---|---|---|
| Proses berjalan bersamaan | ±30 | Cukup; beban puncak diperkirakan 20–30 pengguna aktif |
| Durasi satu proses | 6 menit | Proses dirancang selesai dalam hitungan detik; sinkronisasi dipecah per blok |
| Kirim email per hari | ±1.500 penerima | Kebutuhan diperkirakan < 200 per hari |
| Kapasitas spreadsheet | 10 juta sel | Dijaga dengan pemisahan dan pengarsipan |

### 9.3 Keamanan
Seluruh aturan **Standar Keamanan HCS v1.3** wajib dipenuhi sebelum dipakai karyawan.

### 9.4 Keandalan
- Backup otomatis harian: salinan spreadsheet ke folder backup milik akun unit, disimpan 30 hari.
- Uji pemulihan backup setiap tiga bulan.
- Error dan kegagalan trigger dikirim ke email akun unit.

### 9.5 Tampilan
**Acuan visual utama adalah mockup Claude Design** (`mockup/HCS Mobile.dc.html` dan `mockup/HCS Admin.dc.html`), kecuali layar U1 (lihat 7.3). Aplikasi dibangun semirip mungkin dengan mockup.

Pegadaian Design System dan Design Brief v1.1: #fbc513 (gold), #75c044 (lime), #0da94d (green, warna aksi), #064e43 (forest, judul dan teks); huruf Ronnia (lisensi resmi Pegadaian, disematkan di aplikasi); Bahasa Indonesia baku, huruf kapital hanya di awal kalimat, tanpa emoji.

### 9.6 Kendala yang diketahui
- **Banyak akun Google di satu browser:** Apps Script dapat menolak membuka HCS bila akun bawaan browser bukan akun Pegadaian. Panduan karyawan menjelaskan cara membuka HCS dengan akun kantor (mis. profil Chrome khusus kantor).
- Alamat aplikasi berupa alamat Google (`script.google.com/a/macros/pegadaian.co.id/...`); dapat dipersingkat dengan tautan internal yang disediakan Kanwil.

## 10. Biaya Operasional

**Rp0.** Seluruh komponen sudah termasuk langganan Google Workspace Pegadaian. Tidak ada hosting, database, atau domain berbayar.

## 11. Tata Kelola

1. **Nota dinas atau persetujuan tertulis Pemimpin Wilayah** sebagai dasar kegiatan.
2. Platform mengikuti arahan **IT Security pusat**: aplikasi dan data tetap di dalam Workspace Pegadaian. Perubahan arsitektur di masa depan dikonsultasikan ke pusat terlebih dahulu.
3. Seluruh kode, spreadsheet, folder, dan trigger dimiliki **akun unit** `manohc.balikpapan@pegadaian.co.id`, bukan akun pribadi. Akses akun unit dipegang **minimal dua orang**, verifikasi dua langkah aktif.
4. Admin SDM masuk ke HCS dengan **email pegadaian.co.id masing-masing**, agar setiap tindakan tercatat atas nama orangnya. Akun unit tidak dipakai untuk bekerja sebagai Admin.
5. Dokumentasi serah terima dan checklist perawatan bulanan tersedia.
6. Data tersimpan di Google Workspace Pegadaian; tetap diterapkan minimisasi data dan enkripsi data sensitif.

## 12. Tahapan Pembangunan (garis besar)

| Tahap | Pekerjaan |
|---|---|
| 0 | **Uji kecepatan** dengan data dummy di akun unit (syarat lanjut) |
| 1 | Persiapan: clasp, struktur proyek, proyek HCS-dev, pemeriksaan otomatis |
| 2 | Struktur spreadsheet, enkripsi rekening, data dummy |
| 3 | Identitas, peran, kunci layar 15 menit (U2, U3) dan kerangka navigasi |
| 4 | Data master: sinkronisasi HCMS dan unggah TAD |
| 5 | Klaim Perdin, termasuk bagian TAD |
| 6 | Klaim Perdin Diklat |
| 7 | Permohonan SPPD dan Tugasku |
| 8 | Pemesanan Tiket Pesawat |
| 9 | Perhitungan SPPD di sisi Admin, penguncian data, tampilan nominal setelah Selesai |
| 10 | Deteksi duplikasi |
| 11 | Halaman Admin: dasbor, cetak, ekspor, log akses rekening, pengaturan |
| 12 | Notifikasi email, lonceng, ringkasan harian |
| 13 | Backup, arsip, pengujian keamanan, dan uji beban |
| 14 | Proyek HCS-prod, UAT bersama Admin SDM, pilot |
| 15 | Penyempurnaan tampilan dan dokumentasi serah terima |

Rincian setiap tahap, beserta prompt agen, disusun di **Build Plan v3.0**.

## 13. Pertanyaan Terbuka

1. Validasi ulang template TAD final setelah TAD EPS dan INHOUSE ditambahkan.
2. File web font Ronnia (format WOFF2) dari tim brand.
3. Kolom isian rinci Pemesanan Tiket Pesawat.
4. Orang kedua pemegang akses akun unit `manohc.balikpapan` selain dicky.widyatama@pegadaian.co.id (wajib sebelum Tahap 14).
5. Tautan pendek internal untuk alamat HCS (bila tersedia di Kanwil).

**Terjawab di v2.2:** target kecepatan disesuaikan dengan Apps Script (disetujui); pemegang akses akun unit: dicky.widyatama@pegadaian.co.id; platform (Google Workspace Pegadaian, arahan IT Security pusat); akun pemilik (akun unit `manohc.balikpapan`); Admin memakai email kantor masing-masing. **Tidak berlaku lagi:** pembayaran Cloudways/Supabase, nama domain, region Singapura.
