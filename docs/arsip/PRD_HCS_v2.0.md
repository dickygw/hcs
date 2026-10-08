# PRD — HCS (Human Capital System)

| | |
|---|---|
| **Versi** | 2.0 (Draft) |
| **Tanggal** | 06-10-2026 |
| **Lingkup penggunaan** | Kantor Wilayah IV Balikpapan |
| **Arsitektur** | Cloudways Velocity (aplikasi) + Supabase (database dan dokumen) |
| **Dokumen terkait** | Standar Keamanan HCS v1.1 (wajib), Design Brief v1.0 |
| **Status** | Menunggu persetujuan |

### Riwayat versi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | 26-09-2026 | PRD awal (Next.js, Express, PostgreSQL) |
| 1.1–1.3 (Server), 1.0–1.2 (Workspace) | 29-09-2026 | Dua jalur arsitektur; aturan data master, TAD, dan transparansi |
| **2.0** | 06-10-2026 | **Konsolidasi menjadi satu PRD.** Jalur Google Workspace dihentikan. Hosting di Cloudways Velocity, database dan dokumen di Supabase. Seluruh aturan bisnis dari PRD Workspace v1.2 dipertahankan. Pulse Check ditetapkan sebagai Fase 2. |

PRD ini **menggantikan** PRD Workspace v1.2 dan seluruh lembar perubahan PRD Server. Dokumen lama disimpan sebagai arsip.

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
| TAD | 70% tarif Golongan C (SE 145) |

Admin dapat mengisi **JG untuk Perdin (koreksi manual)** untuk kasus khusus (mis. Masa Persiapan Pensiun dengan JG tercatat 0). Koreksi tercatat di log dan tidak tertimpa sinkronisasi.

**Uang harian menginap (per hari):**

| Komponen | Gol. A | Gol. B | Gol. C | TAD |
|---|---|---|---|---|
| Transportasi lokal, uang makan, cuci pakaian | Rp520.000 | Rp410.000 | Rp300.000 | Rp210.000 |
| Transportasi ke/dari bandara, stasiun, terminal, pelabuhan (per sekali jalan) | Rp250.000 | Rp250.000 | Rp250.000 | Perlu dikonfirmasi |

Menggunakan kendaraan dinas: uang harian menginap tetap 100%.

**Uang harian tidak menginap (jarak > 30 km):**

| Jarak | Gol. A | Gol. B | Gol. C | TAD |
|---|---|---|---|---|
| >30 – 60 km | Rp350.000 | Rp250.000 | Rp180.000 | Rp126.000 |
| >60 km | Rp380.000 | Rp270.000 | Rp200.000 | Rp140.000 |

Menggunakan kendaraan dinas: uang harian 50% dan transportasi bandara/stasiun/terminal/pelabuhan tidak dibayarkan.

**Ketentuan lain:** bantuan sewa rumah untuk penugasan > 12 hari dan menginap (Rp3.300.000 / Rp2.200.000 / Rp1.300.000 per bulan untuk A/B/C); transportasi dan hotel at cost; tarif disimpan di tabel **tarif_sppd** agar dapat diperbarui Admin tanpa mengubah kode; setiap penyesuaian Admin dicatat.

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
- Sumber: Template Unggah TAD (1.346 TAD aktif; vendor POJ dan PKSS; seluruh rekening BRI). Dikelola **terpisah** dari sinkronisasi HCMS.
- Kolom: NIK, nama, nama bank, nomor rekening (terenkripsi), vendor, unit kerja, tanggal akhir kontrak (**opsional**), sumber data (unggahan/input manual), status verifikasi.
- Unggahan: merapikan rekening menjadi angka, menolak rekening BRI yang bukan 15 digit, mengosongkan tanggal kontrak yang tidak diketahui, menandai data ganda/NIK tidak valid/rekening kosong, ringkasan sebelum "Terapkan".
- Status aktif mengikuti unggahan terbaru; TAD yang hilang dari file **dinonaktifkan, tidak dihapus**.
- TAD input manual masuk data master berlabel **"Input manual, belum terverifikasi"**.
- **Kondisi saat ini:** 17 baris rekening perlu diperbaiki sebelum impor pertama.

### 6.4 Perlindungan rekening TAD
Hanya Admin yang dapat melihat rekening (tampil tersamar ••••1234; lengkap hanya di cetakan/ekspor pembayaran). Setiap cetak/ekspor dengan rekening lengkap dicatat. Rekening karyawan tetap **tidak** disimpan.

## 7. Arsitektur Teknis

| Komponen | Teknologi | Keterangan |
|---|---|---|
| Frontend | **Next.js** | Di Cloudways Velocity |
| Backend | **Node.js + Express** (layanan terpisah) | Di Cloudways Velocity; satu-satunya pihak yang mengakses database |
| Hosting | **Cloudways Velocity Professional** (2 vCPU, 4 GB RAM) | Region **Singapura** (sama dengan Supabase) |
| Database | **Supabase PostgreSQL** (paket Pro) | Region **Singapura**; backup harian 7 hari |
| Dokumen | **Supabase Storage** | Bucket privat; dibuka melalui backend dengan tautan sementara |
| Login | **Sign in with Google**, dibatasi domain pegadaian.co.id | OAuth client dibuat di project Google Cloud gratis (tanpa billing) |
| Email | **Nodemailer + SMTP Gmail akun unit SDM** (App Password) | Melalui antrean |
| Tugas terjadwal | **node-cron** di backend | Antrean email, ringkasan harian, pengingat sinkronisasi |
| Kode | **GitHub privat**, deploy otomatis ke Velocity dari branch `main` | |
| Struktur repo | Monorepo: `frontend/`, `backend/`, `database/`, `docs/` | |

**Prinsip:** browser **tidak pernah** mengakses Supabase secara langsung. Semua permintaan melalui backend yang menjalankan pemeriksaan hak akses (Standar Keamanan AKSES-01 s.d. 07 dan SUPA-01 s.d. 06).

### 7.1 Tabel database

| Tabel | Isi |
|---|---|
| `pengguna` | Email, peran (Karyawan/Admin), status aktif |
| `karyawan` | 12 kolom HCMS + `jg_perdin_override`, status aktif, waktu pembaruan |
| `tad` | NIK, nama, bank, rekening (terenkripsi), vendor, unit, tgl akhir kontrak (opsional), sumber data, terverifikasi, aktif |
| `tarif_sppd` | Tarif per golongan dan komponen, masa berlaku |
| `jenis_layanan` | Empat layanan Fase 1 |
| `pengajuan` | Data pengajuan, salinan JG/golongan/jabatan/unit, status, pernyataan TAD, nominal disetujui |
| `pengajuan_tad` | Rincian TAD per pengajuan, salinan bank/rekening (terenkripsi), nominal, status rekening; unik per `no_surat_tugas + tad_id` aktif |
| `dokumen` | Metadata file di Supabase Storage (nama acak, jenis, ukuran, pemilik) |
| `riwayat_status` | Setiap perubahan status, oleh siapa, kapan, catatan |
| `notifikasi` | Lonceng in-app |
| `antrean_email` | Email yang menunggu dikirim |
| `log_perubahan` | Penyesuaian nominal, koreksi JG, perubahan data |
| `log_akses_rekening` | Cetak/ekspor dengan rekening lengkap |
| `riwayat_sinkronisasi` | Sinkronisasi HCMS dan unggahan TAD |

## 8. Notifikasi

Saluran: email ke alamat pegadaian.co.id dan lonceng in-app. TAD tidak menerima notifikasi.

| Kejadian | Penerima | Email | In-app |
|---|---|---|---|
| Pengajuan berhasil dikirim | Karyawan | Ya | Ya |
| Pengajuan diminta revisi | Karyawan | Ya | Ya |
| Pengajuan selesai (tautan melihat nominal) | Karyawan | Ya | Ya |
| Pengajuan ditolak (beserta alasan) | Karyawan | Ya | Ya |
| Status berubah menjadi Diproses | Karyawan | Tidak | Ya |
| Pengajuan baru masuk Tugasku | Admin | Tidak | Ya |
| Ringkasan harian Tugasku | Admin | Ya, hari kerja 07.00 WITA* | Tidak |
| Peringatan duplikasi | Admin | Tidak | Ya |
| Pengingat sinkronisasi data karyawan | Admin | Ya | Ya |
| TAD belum terdaftar / rekening TAD belum lengkap | Admin | Ya (ringkasan harian) | Ya |

*Jam perlu dikonfirmasi. Format subjek: `[HCS] <Jenis Layanan> <Nomor Pengajuan> <status>`. Email tidak memuat nominal, rekening, maupun lampiran.

## 9. Kebutuhan Non-Fungsional

### 9.1 Kecepatan

| Aksi | Target |
|---|---|
| Membuka aplikasi pertama kali | ≤ 3 detik |
| Pindah menu, riwayat, detail | ≤ 1 detik |
| Mengirim pengajuan | ≤ 1 detik (dirasakan) |
| Saran nama TAD | ≤ 0,5 detik |
| Unggah dokumen 5 MB (4G) | ≤ 10 detik |
| Filter dan ekspor Admin | ≤ 2 detik |
| 50 pengguna bersamaan | Tanpa error |

### 9.2 Keamanan
Seluruh aturan **Standar Keamanan HCS v1.1** wajib dipenuhi sebelum deploy produksi.

### 9.3 Keandalan
- Backup harian Supabase (7 hari) + ekspor database terenkripsi mingguan di luar Supabase.
- Uji pemulihan backup setiap tiga bulan.
- Pemantauan uptime dengan notifikasi email ke PIC.
- Sesi berakhir setelah 15 menit tanpa aktivitas.

### 9.4 Tampilan
Pegadaian Design System dan Design Brief v1.0: #fbc513 (gold), #75c044 (lime), #0da94d (green, warna aksi), #064e43 (forest, judul dan teks); huruf Ronnia (jika lisensi web tersedia); Bahasa Indonesia baku, huruf kapital hanya di awal kalimat, tanpa emoji.

## 10. Biaya Operasional

| Komponen | Per bulan | Per tahun |
|---|---|---|
| Cloudways Velocity Professional | $30 | $360 |
| Supabase Pro | $25 | $300 |
| **Total** | **$55 (±Rp900 rb)** | **$660 (±Rp11 jt)** |
| Domain .id (jika dipakai) | | ±Rp225 rb |

Asumsi kurs ±Rp16.500/USD; belum termasuk pajak. Disarankan menyiapkan cadangan ±20% untuk kenaikan kurs dan penambahan compute Supabase saat Fase 2.

## 11. Tata Kelola

1. **Nota dinas atau persetujuan tertulis Pemimpin Wilayah** sebagai dasar kegiatan dan anggaran.
2. Akun Cloudways, Supabase, GitHub, dan Google Cloud (OAuth) didaftarkan dengan **email unit SDM**, verifikasi dua langkah aktif, akses dipegang minimal dua orang.
3. Mekanisme pembayaran tahunan dan pertanggungjawabannya disepakati dengan bagian keuangan.
4. Dokumentasi serah terima dan checklist perawatan bulanan tersedia.
5. Data tersimpan di Singapura; dimitigasi dengan minimisasi data dan enkripsi data sensitif.

## 12. Tahapan Pembangunan (garis besar)

| Tahap | Pekerjaan |
|---|---|
| 1 | Persiapan: repo GitHub privat, struktur monorepo, akun layanan, environment variable |
| 2 | Skema database Supabase, kebijakan keamanan (RLS tolak semua), bucket privat |
| 3 | Login Google, sesi, dan peran |
| 4 | Data master: sinkronisasi HCMS dan unggah TAD |
| 5 | Klaim Perdin, termasuk bagian TAD |
| 6 | Klaim Perdin Diklat |
| 7 | Permohonan SPPD dan Tugasku |
| 8 | Pemesanan Tiket Pesawat |
| 9 | Perhitungan SPPD di sisi Admin, penguncian data, tampilan nominal setelah Selesai |
| 10 | Deteksi duplikasi |
| 11 | Halaman Admin: cetak, ekspor, log akses rekening |
| 12 | Notifikasi email, lonceng, ringkasan harian |
| 13 | Pengujian keamanan wajib, E2E, dan uji beban |
| 14 | Deploy ke Cloudways, UAT bersama Admin SDM, pilot |
| 15 | Penyempurnaan tampilan dan dokumentasi serah terima |

Rincian setiap tahap, beserta prompt Claude Code, disusun di **Build Plan v2.0**.

## 13. Pertanyaan Terbuka

1. Akun email unit SDM yang dipakai untuk seluruh layanan.
2. Mekanisme pembayaran tahunan Cloudways dan Supabase dengan bagian keuangan.
3. Domain: memakai domain bawaan Cloudways atau membeli domain .id.
4. Jam ringkasan harian Admin.
5. Lisensi web huruf Ronnia.
6. Transportasi bandara untuk TAD: penuh atau 70%.
7. Status TAD vendor EPS (237) dan INHOUSE (1) yang tidak masuk template.
8. Perbaikan 17 baris rekening TAD.
9. Ketersediaan region Singapura di Cloudways Velocity (konfirmasi saat mendaftar).
