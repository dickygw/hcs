# Design Brief — HCS (Human Capital System)

| | |
|---|---|
| **Versi** | 1.1 (Draft) |
| **Tanggal** | 07-10-2026 |
| **Acuan** | PRD HCS v2.1, Standar Keamanan HCS v1.1 |
| **Status** | Menunggu persetujuan |

Perubahan dari v1.0: disesuaikan dengan PRD v2.1 (bagian TAD di form, transparansi nominal setelah Selesai, tab Karyawan/TAD di Tugasku, sinkronisasi HCMS, data TAD, lengkapi rekening, koreksi JG, lonceng notifikasi, halaman audit).

---

## 1. Prinsip Desain

1. **HP dulu untuk karyawan, laptop dulu untuk Admin.** Karyawan sebagian besar mengajukan dari HP; Admin bekerja di laptop dengan tabel dan dokumen.
2. **Modern dan ringkas.** Satu layar, satu tujuan. Hanya tampilkan yang dibutuhkan pada langkah itu.
3. **Status selalu terlihat.** Karyawan tidak perlu bertanya "pengajuan saya sampai mana".
4. **Karyawan mengisi fakta, Admin menghitung.** Tidak ada angka tarif atau hasil hitungan di layar karyawan sebelum Selesai.
5. **Aman tanpa terasa ribet.** Data sensitif (rekening) tersamar secara bawaan; konfirmasi hanya untuk tindakan yang tidak dapat dibatalkan.

## 2. Identitas Visual

### 2.1 Warna

| Token | Hex | Fungsi |
|---|---|---|
| `forest` | #064E43 | Judul, teks utama, header, navigasi aktif |
| `green` | #0DA94D | Warna aksi merek: ikon, garis aktif, elemen besar |
| `green-700` | #08803A | **Tombol utama dan tautan** (teks putih di atas warna ini lolos kontras AA) |
| `lime` | #75C044 | Aksen sekunder, grafik, penanda sukses ringan |
| `gold` | #FBC513 | Sorotan dan lencana; **teks di atasnya wajib `forest`**; tidak dipakai sebagai warna teks |
| `abu-900` | #1F2933 | Teks isi |
| `abu-600` | #616E7C | Teks pendukung |
| `abu-200` | #E4E7EB | Garis dan pembatas |
| `abu-50` | #F7F8FA | Latar halaman |
| `putih` | #FFFFFF | Latar kartu dan form |
| `merah` | #C62828 | Error, Ditolak, tindakan berbahaya |
| `oranye` | #E8710A | Perlu revisi, peringatan |

Alasan `green-700`: teks putih di atas #0DA94D hanya mencapai kontras ±3:1, di bawah standar keterbacaan (4,5:1) untuk teks tombol berukuran normal.

### 2.2 Warna status pengajuan

| Status | Tampilan lencana |
|---|---|
| Draf | Latar abu-200, teks abu-900 |
| Dikirim | Garis forest, teks forest |
| Diproses | Latar gold, teks forest |
| Perlu revisi | Latar oranye muda, teks oranye tua |
| Selesai | Latar hijau muda, teks green-700 |
| Ditolak | Latar merah muda, teks merah |

Setiap lencana selalu memuat **teks status**, tidak hanya warna.

### 2.3 Tipografi
Huruf **Ronnia** (lisensi resmi Pegadaian, di-host di aplikasi), cadangan: `system-ui, sans-serif`.

| Gaya | HP | Laptop | Ketebalan |
|---|---|---|---|
| Judul halaman | 22 px | 24 px | Bold |
| Subjudul | 18 px | 18 px | Semibold |
| Teks isi | 16 px | 15 px | Regular |
| Teks tabel | — | 14 px | Regular |
| Keterangan kecil | 13 px | 13 px | Regular |

Angka nominal memakai angka sejajar (tabular) agar rapi dalam kolom.

### 2.4 Gaya komponen
- Sudut: tombol dan input 8 px, kartu 12 px.
- Bayangan: tipis, hanya untuk kartu dan panel mengambang.
- Ikon: gaya garis (Lucide), 20 px.
- Tombol utama: latar `green-700`, teks putih. Tombol sekunder: garis `forest`. Tombol bahaya: teks/garis `merah`.
- Area sentuh minimal 44 × 44 px di HP.

## 3. Peta Layar

**Bersama**
- U1 Masuk (Sign in with Google)
- U2 Akun belum terdaftar
- U3 Sesi berakhir

**Karyawan (HP dulu)** — navigasi bawah: Pengajuan · Notifikasi · Profil
- K1 Pengajuan Saya (beranda)
- K2 Pilih Jenis Layanan
- K3 Form Pengajuan (bertahap)
- K4 Detail Pengajuan
- K5 Notifikasi
- K6 Profil

**Admin (laptop dulu)** — menu samping: Dasbor · Tugasku · Semua Pengajuan · Data Karyawan · Data TAD · Tarif SPPD · Log Audit · Pengaturan
- A1 Dasbor
- A2 Tugasku (tab Karyawan | TAD)
- A3 Detail Pengajuan (Admin)
- A4 Semua Pengajuan
- A5 Data Karyawan + Sinkronisasi HCMS
- A6 Data TAD + Unggah Template
- A7 Tarif SPPD
- A8 Log Audit
- A9 Pengaturan

## 4. Detail per Layar

### 4.1 Bersama

| Layar | Tujuan | Elemen utama | Aksi | Kondisi khusus |
|---|---|---|---|---|
| U1 Masuk | Login | Logo Pegadaian, nama HCS, satu tombol "Masuk dengan akun Google Pegadaian" | Masuk | **Loading:** tombol berputar. **Error:** "Gunakan akun @pegadaian.co.id untuk masuk." |
| U2 Akun belum terdaftar | Menjelaskan akses ditolak | Pesan, email yang dipakai, kontak Admin SDM | Keluar, Coba akun lain | — |
| U3 Sesi berakhir | Setelah 15 menit diam | Pesan singkat | Masuk kembali | Draf form yang belum terkirim tetap tersimpan |

### 4.2 Karyawan

| Layar | Tujuan | Elemen utama | Aksi | Kosong / loading / error / sukses |
|---|---|---|---|---|
| **K1 Pengajuan Saya** | Melihat semua pengajuan dan posisinya | Tombol "Ajukan" ukuran normal di kanan atas; filter status (chip: Semua, Berjalan, Perlu revisi, Selesai); kartu pengajuan: jenis layanan, nomor, No. Surat Tugas, tanggal perjalanan, lencana status, waktu pembaruan terakhir | Ajukan, buka detail, tarik untuk memuat ulang | **Kosong:** ilustrasi sederhana, "Belum ada pengajuan", tombol "Ajukan" ukuran normal di tengah. **Loading:** kerangka kartu (skeleton). **Error:** "Daftar pengajuan gagal dimuat." + tombol Coba lagi. **Perlu revisi** diletakkan paling atas dengan penanda oranye |
| **K2 Pilih Jenis Layanan** | Memilih layanan | 4 kartu: Klaim Biaya Perdin, Klaim Perdin Diklat, Permohonan SPPD, Pemesanan Tiket Pesawat; masing-masing dengan satu kalimat penjelasan | Pilih | — |
| **K3 Form Pengajuan** | Mengisi fakta perjalanan | Penunjuk langkah di atas; satu langkah per layar (lihat 5.1); tombol Kembali dan Lanjut di bawah; "Draf tersimpan otomatis" | Lanjut, Kembali, Simpan draf, Kirim | **Loading unggah:** progres per file. **Error:** pesan di bawah kolom terkait. **Sukses kirim:** layar konfirmasi dengan nomor pengajuan dan tombol "Lihat pengajuan" |
| **K4 Detail Pengajuan** | Melacak dan menindaklanjuti | Kepala: jenis, nomor, lencana status. **Linimasa status** (waktu, pemroses, catatan). Ringkasan isian. Dokumen (pratinjau). Daftar TAD (nama, NIK, vendor; tanpa rekening). **Kartu "Nominal disetujui"** hanya saat Selesai: rincian per orang + total | Edit & kirim ulang (saat Perlu revisi), Batalkan (sebelum Diproses), unduh dokumen sendiri | **Perlu revisi:** kotak oranye berisi catatan Admin di paling atas. **Ditolak:** kotak merah berisi alasan. **Diproses:** "Sedang diproses Admin SDM sejak [tanggal]." |
| **K5 Notifikasi** | Melihat pemberitahuan | Daftar notifikasi terbaru, tanda belum dibaca | Buka pengajuan terkait, tandai semua dibaca | **Kosong:** "Belum ada notifikasi." |
| **K6 Profil** | Melihat identitas | Nama, NIK, jabatan, unit kerja | Keluar | Data tidak sesuai → "Hubungi Admin SDM untuk pembaruan data." |

### 4.3 Admin

| Layar | Tujuan | Elemen utama | Aksi | Kosong / loading / error / sukses |
|---|---|---|---|---|
| **A1 Dasbor** | Melihat yang perlu perhatian hari ini | **Indikator umur data karyawan** (hijau/kuning/merah + tombol Sinkronkan); kartu angka: Dikirim, Diproses, Perlu revisi menunggu karyawan; daftar perhatian: duplikasi, TAD belum terdaftar, rekening TAD belum lengkap | Buka Tugasku, buka item, sinkronkan | **Kosong:** "Tidak ada yang perlu ditindaklanjuti." |
| **A2 Tugasku** | Antrean kerja harian | **Tab Karyawan / TAD** dengan penghitung; filter status, jenis layanan, rentang tanggal; kotak cari (nomor, nama, No. Surat Tugas); tabel: nomor, nama, jenis, No. Surat Tugas, tanggal masuk, status, penanda (duplikasi, rekening kosong) | Buka detail | **Kosong:** "Semua pengajuan sudah ditindaklanjuti." **Loading:** kerangka baris tabel. **Error:** banner + Coba lagi |
| **A3 Detail Pengajuan (Admin)** | Memeriksa, menghitung, memutuskan | **Kiri:** data isian, penampil dokumen (Surat Tugas, kuitansi). **Kanan:** panel perhitungan SPPD otomatis per orang (karyawan dan setiap TAD), isian biaya at cost, kolom penyesuaian + alasan wajib; rincian TAD dengan rekening tersamar dan tombol "Lengkapi rekening" bila kosong; peringatan duplikasi dan data karyawan kedaluwarsa di atas panel. **Bawah:** linimasa status | Proses, Minta revisi (catatan wajib), Tolak (alasan wajib), Selesai, Cetak | **Selesai nonaktif** bila rekening TAD kosong, dengan keterangan alasannya. **Sukses:** notifikasi singkat "Status diubah menjadi Selesai." |
| **A4 Semua Pengajuan** | Pencarian dan laporan | Filter lengkap, tabel, total nominal hasil filter | Ekspor (CSV/Excel), Cetak | Ekspor dengan rekening lengkap → dialog konfirmasi "Ekspor ini memuat nomor rekening dan akan tercatat di log." |
| **A5 Data Karyawan** | Mengelola master karyawan | Tabel karyawan (NIK, nama, jabatan, unit, JG, golongan, status), kotak cari; tombol **Sinkronisasi HCMS** | Sinkronkan, Koreksi JG untuk Perdin (alasan wajib) | **Wizard sinkronisasi:** 1 Unggah file → 2 Pemeriksaan → 3 Ringkasan perubahan (baru, nonaktif, berubah JG/golongan, pindah unit; dapat dibuka rinciannya) → 4 Terapkan. **Error file:** daftar kolom yang hilang/salah |
| **A6 Data TAD** | Mengelola master TAD | Tabel TAD (NIK, nama, vendor, unit, rekening tersamar, sumber data, status), label "Input manual, belum terverifikasi" | Unggah template, unduh template kosong, lengkapi/ubah rekening | **Wizard unggah:** sama dengan A5, ditambah daftar baris bermasalah (rekening bukan 15 digit, NIK ganda) |
| **A7 Tarif SPPD** | Memperbarui tarif | Tabel tarif per golongan dan komponen, tanggal berlaku | Ubah tarif (berlaku mulai tanggal tertentu) | Konfirmasi sebelum simpan: "Tarif baru berlaku untuk pengajuan yang dikirim mulai [tanggal]." |
| **A8 Log Audit** | Jejak tindakan | Tab: Perubahan data, Akses rekening, Sinkronisasi; filter pelaku dan tanggal | Ekspor log | **Kosong:** "Belum ada catatan." |
| **A9 Pengaturan** | Konfigurasi | Jam ringkasan harian (bawaan 08.00 WITA), daftar Admin | Ubah, tambah/nonaktifkan Admin | — |

## 5. Alur Pengguna

### 5.1 Karyawan mengajukan Klaim Perdin (HP)
1. K1 → **Ajukan** → K2 pilih **Klaim Biaya Perdin**.
2. **Langkah 1 – Surat tugas:** No. Surat Tugas, unggah Surat Tugas.
3. **Langkah 2 – Perjalanan:** kota/unit tujuan, tanggal berangkat, tanggal kembali, menginap atau tidak; jika tidak menginap, pilihan jarak.
4. **Langkah 3 – Transportasi:** moda, kendaraan dinas (ya/tidak).
5. **Langkah 4 – TAD (opsional):** "Apakah ada TAD dalam Surat Tugas ini?" → cari nama → tambahkan; atau "TAD belum terdaftar".
6. **Langkah 5 – Bukti:** unggah kuitansi hotel/transportasi dan formulir pengajuan.
7. **Langkah 6 – Tinjau & kirim:** ringkasan semua isian, centang pernyataan TAD (jika ada TAD) → **Kirim**.
8. Layar sukses → K4.

Langkah yang tidak relevan dilewati otomatis sesuai jenis layanan (mis. Permohonan SPPD tanpa kuitansi; Klaim Perdin Diklat memakai Surat Pemanggilan).

### 5.2 Karyawan menindaklanjuti revisi
Notifikasi/email → K4 (kotak catatan oranye) → **Edit** → form terisi → ubah → **Kirim ulang** (nomor tetap).

### 5.3 Admin memproses
A2 → buka baris → A3 → cek dokumen → **Proses** → isi biaya at cost, periksa hitungan, sesuaikan bila perlu → lengkapi rekening TAD bila kosong → **Selesai** (atau Minta revisi / Tolak).

### 5.4 Admin sinkronisasi data
A1 indikator kuning/merah → **Sinkronkan** → wizard A5 → Terapkan.

## 6. Pola Interaksi

| Pola | Aturan |
|---|---|
| Navigasi | Karyawan: navigasi bawah 3 menu di HP, menu atas di laptop. Admin: menu samping tetap di laptop, bisa diciutkan. |
| Form | Satu kolom; label di atas kolom; kolom wajib tanpa tanda bintang, kolom opsional diberi teks "(opsional)"; satu langkah per layar di HP; draf tersimpan otomatis. |
| Validasi | Diperiksa saat kolom ditinggalkan; pesan merah di bawah kolom; saat Lanjut/Kirim ditekan, layar menggulir ke kolom pertama yang salah. |
| Pencarian TAD | Saran muncul setelah 3 huruf; setiap baris: nama (tebal), NIK · vendor · unit; maksimal 8 saran. |
| Unggah file | Area unggah dengan ikon; menampilkan nama, ukuran, progres, tombol hapus; tolak langsung bila bukan PDF/JPG/PNG atau > 5 MB. |
| Konfirmasi | Dialog hanya untuk: Batalkan pengajuan, Tolak, Ekspor dengan rekening, Terapkan sinkronisasi, Ubah tarif. Tombol dialog menyebut tindakannya ("Tolak pengajuan"), bukan "OK". |
| Umpan balik | Notifikasi singkat di bawah layar (HP) atau kanan atas (laptop), hilang setelah 4 detik. |
| Loading | Kerangka (skeleton) untuk daftar dan tabel; putaran kecil di tombol untuk aksi. |
| Format | Nominal `Rp1.250.000`; tanggal `6 Okt 2026`; waktu `08.00 WITA`. |
| Rekening | Selalu tersamar `••••1234` di layar Admin; tidak pernah tampil di layar karyawan. |

## 7. Aksesibilitas dan Perangkat

- **HP (karyawan):** lebar acuan 360–430 px; area sentuh ≥ 44 px; tombol aksi utama di bawah layar mudah dijangkau jempol.
- **Laptop (Admin):** lebar acuan 1366 px; tabel padat dengan baris 44 px; panel detail dua kolom.
- Kontras teks minimal 4,5:1 (alasan adanya `green-700`).
- Status tidak hanya dibedakan dengan warna, selalu ada teks.
- Semua ikon tanpa teks memiliki label untuk pembaca layar.
- Tetap dapat dipakai di jaringan 4G lemah: halaman awal ringan, gambar diperkecil sebelum diunggah.

## 8. Penulisan Teks Antarmuka

- Bahasa Indonesia baku, sapaan netral, kalimat pendek, huruf kapital hanya di awal kalimat, tanpa emoji.
- Tombol memakai kata kerja: "Ajukan", "Kirim pengajuan", "Minta revisi".
- Pesan error menjelaskan **apa yang salah** dan **apa yang harus dilakukan**.

| Situasi | Contoh pesan |
|---|---|
| Kolom kosong | "Isi nomor Surat Tugas." |
| File terlalu besar | "Ukuran file melebihi 5 MB. Perkecil file lalu unggah kembali." |
| Jenis file salah | "Unggah file PDF, JPG, atau PNG." |
| TAD ganda | "TAD ini sudah diajukan dalam pengajuan KP-0123." |
| Koneksi terputus | "Koneksi terputus. Isian Anda tersimpan sebagai draf." |
| Rekening TAD kosong | "Lengkapi rekening TAD sebelum menyelesaikan pengajuan." |
| Sukses kirim | "Pengajuan KP-0123 terkirim. Status dapat dipantau di halaman Pengajuan Saya." |

## 9. Asumsi dan Pertanyaan Terbuka

**Asumsi**
1. Isian Pemesanan Tiket Pesawat (rute, tanggal, waktu yang diinginkan) mengikuti form Permohonan SPPD; rincian kolom dikonfirmasi saat membangun tahap 8.
2. Logo Pegadaian versi digital tersedia dari tim brand.
3. Admin tidak memerlukan tampilan HP penuh; layar Admin cukup dapat dibuka di HP untuk melihat, bukan bekerja.

**Pertanyaan terbuka**
1. Kolom isian Pemesanan Tiket Pesawat secara rinci.
2. File logo Pegadaian (SVG) dan web font Ronnia (WOFF2).
