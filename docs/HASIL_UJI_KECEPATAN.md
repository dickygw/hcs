# Hasil Uji Kecepatan (Build Plan v3.0 Tahap 0)

| | |
|---|---|
| **Tanggal** | 09-10-2026 |
| **Proyek** | HCS-POC (akun unit), data dummy volume 3 tahun |
| **Perangkat** | Laptop kantor. **HP 4G belum diuji** (dipindah ke Tahap 13 dan pilot) |
| **Kesimpulan** | **Lulus dengan catatan** — Apps Script + Sheets layak untuk HCS dengan rancangan v5 di bawah |

## 1. Hasil akhir (rancangan v5)

| Aksi | Median | p75 | Server | Target PRD 9.1 | Status |
|---|---|---|---|---|---|
| Buka aplikasi | 1,17 dtk | 1,50 dtk | 0,39 dtk | ≤ 4 dtk | Lulus |
| Pengajuan saya (sheet aktif) | — | — | — | ≤ 1 dtk | Tercakup di Buka aplikasi |
| Pengajuan saya dari arsip | 1,17 dtk | 1,52 dtk | 0,35 dtk | — | Info |
| Detail pengajuan | 1,09 dtk | 1,15 dtk | 0,14 dtk | ≤ 1 dtk | Tipis di atas target (lihat 3.1) |
| Detail dari arsip | 1,02 dtk | 1,04 dtk | 0,13 dtk | — | Info |
| Muat daftar TAD (1.346) | 0,80 dtk | 0,80 dtk | 0,07 dtk | ≤ 3 dtk | Lulus |
| Saran nama TAD | 0,00 dtk | 0,00 dtk | — | ≤ 0,5 dtk | Lulus |
| Kirim pengajuan (dirasakan) | 0,00 dtk | 0,00 dtk | — | ≤ 1 dtk | Lulus (tampilan optimistis) |
| Kirim pengajuan (selesai di server) | 2,93 dtk | — | 1,90 dtk | — | Info |
| Unggah (foto 0,8 MB) | 4,64 dtk | — | 2,58 dtk | ≤ 10 dtk | Lulus (5 MB di 4G belum diuji) |
| Tugasku filter/cari (12×) | 0,85 dtk | 0,95 dtk | 0,11 dtk | ≤ 3 dtk | Lulus |
| Ekspor | 0,88 dtk | — | 0,15 dtk | ≤ 3 dtk | Lulus |
| 20 kiriman bersamaan | 20/20 berhasil | — | — | Tanpa error | Lulus, antrean terlama 29 dtk (lihat 3.2) |

## 2. Perjalanan uji (pelajaran untuk pembangunan)

| Versi | Rancangan | Temuan |
|---|---|---|
| v1–v3 | 10.000 pengajuan di satu sheet, cache seluruh tabel, tulis per sel/`insertRows` | Buka aplikasi p75 4,3–5 dtk; simulasi gagal 20/20 saat batas tunggu kunci 10 dtk |
| v4 | `appendRow`, cache ditulis ulang di dalam kunci | Kerja di dalam kunci naik ke 1,8 dtk (cache ±4 MB); cache sering dibuang Google |
| **v5** | **Sheet aktif kecil + arsip per tahun** (PRD 7.1), cache hanya sheet aktif dan master, nomor dari penghitung | Semua aksi baca ±1 dtk dengan cache 100% |

## 3. Catatan yang dibawa ke pembangunan

### 3.1 Batas bawah ±0,8–0,9 detik per panggilan
Kerja server hanya 0,1–0,4 dtk; sisanya waktu bawaan Google untuk setiap `google.script.run`. Detail (1,09 dtk) tidak bisa dipercepat dari sisi server. Penanganan di aplikasi:
- data detail ikut dimuat bersama daftar (atau dimuat lebih dulu di latar belakang), lalu disimpan di cache browser (WEB-06), sehingga membuka detail terasa instan;
- satu panggilan per layar tetap wajib.

### 3.2 Antrean penulisan
Kerja di dalam kunci masih ±1,5 dtk per kiriman. Dengan 20 kiriman di detik yang sama, yang terakhir menunggu hingga 29 dtk (batas 30 dtk). Pada pemakaian nyata kiriman bersamaan sangat jarang, dan pengguna tidak menunggu karena tampilan optimistis. Tetap diperbaiki saat membangun modul data (Tahap 2):
- kunci hanya untuk mengambil nomor dari penghitung dan pemeriksaan unik (TAD per Surat Tugas);
- `appendRow` (atomik) di luar kunci;
- cache diperbarui tanpa menulis ulang seluruh tabel.
Target uji ulang di Tahap 13: kerja di dalam kunci ≤ 0,3 dtk, antrean terlama ≤ 10 dtk untuk 20 kiriman bersamaan.

### 3.3 Rancangan data yang ditetapkan
- Sheet aktif: pengajuan berjalan + selesai/ditolak ≤ 90 hari. Arsip: satu sheet per tahun. Pemindahan ke arsip berjalan otomatis sejak awal (bukan menunggu Tahap 13).
- Cache server hanya untuk sheet aktif dan data master; tidak pernah untuk tabel besar.
- Semua sheet diformat teks; tanggal disimpan ISO; tanpa rumus.

### 3.4 Belum diuji
HP dengan jaringan 4G, unggah 5 MB di 4G, dan penguji selain akun unit. Diuji di Tahap 13 (uji beban) dan pilot Tahap 14.
