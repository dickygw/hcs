# Spesifikasi Uji Kecepatan (POC) — HCS Versi Google Workspace

| | |
|---|---|
| **Tahap** | 0 (sebelum pembangunan penuh) |
| **Acuan** | PRD HCS Workspace v1.2, Bagian 10 dan 13 |
| **Alat bangun** | Claude Code + clasp |
| **Tanggal** | 29-09-2026 |

## 1. Tujuan

Membuktikan dengan angka nyata apakah Google Apps Script + Google Sheets mampu memenuhi target kecepatan HCS pada volume data beberapa tahun, sebelum 14 tahap pembangunan dimulai.

Hasil uji menjadi dasar keputusan:
- **Lulus** → lanjut membangun HCS di Google Workspace.
- **Tidak lulus** → beralih ke PRD Versi Server sejak awal.

## 2. Aturan Penting

1. **Hanya data dummy.** Tidak boleh memakai data karyawan, data TAD, atau rekening asli dalam uji ini.
2. POC adalah kode buangan: fokus pada pengukuran, bukan kelengkapan fitur atau tampilan akhir.
3. Namun **teknik performa wajib sama** dengan yang akan dipakai di aplikasi sebenarnya (Bagian 5), agar hasilnya mewakili.

## 3. Data Dummy

Dibuat oleh fungsi `generateDummyData()` yang dijalankan sekali.

| Spreadsheet | Sheet | Jumlah baris |
|---|---|---|
| HCS_POC_Master | Karyawan | 873 (nama acak, email dummy, JG 4–16 dengan sebaran mirip data nyata: ±83% Gol C, ±16% Gol B, ±1% Gol A) |
| HCS_POC_Master | TAD | 1.346 (nama acak, NIK acak, vendor POJ/PKSS, unit acak, rekening 15 digit acak) |
| HCS_POC_Master | TarifSPPD | Tarif sesuai PRD v1.2 Bagian 6.5 |
| HCS_POC_Data | Pengajuan | 10.000 (tersebar 3 tahun, semua status, ±20% memuat TAD) |
| HCS_POC_Data | PengajuanTAD | ±3.000 |
| HCS_POC_Data | RiwayatStatus | ±35.000 |
| HCS_POC_Log | LogKinerja | Diisi saat uji |

Sertakan beberapa nama TAD yang sama persis dengan NIK berbeda untuk menguji pembeda di saran nama.

## 4. Layar yang Dibangun

Untuk POC, tersedia tombol **"Lihat sebagai: Karyawan / Admin"** di pojok atas (hanya untuk uji; di aplikasi asli peran ditentukan dari data).

### Layar 1 — Riwayat Pengajuan (Karyawan)
- Daftar pengajuan milik satu karyawan dummy (pilih karyawan yang punya ±40 pengajuan).
- Klik pengajuan → detail dengan **linimasa riwayat status**.
- Pengajuan berstatus Selesai menampilkan nominal yang disetujui.

### Layar 2 — Form Klaim Perdin (Karyawan)
- Isian fakta sesuai PRD Bagian 6.8 (tanpa perhitungan).
- Bagian terpisah **"TAD dalam Surat Tugas ini"** dengan saran nama dari 1.346 TAD. Saran menampilkan nama, NIK, vendor, unit — **tanpa rekening**. Pencarian dilakukan di perangkat.
- Unggah file (PDF/JPG) maks 5 MB; foto diperkecil di perangkat sebelum dikirim.
- Tombol Kirim dengan tampilan optimistis.

### Layar 3 — Tugasku (Admin)
- Tab **Karyawan** dan **TAD**, dengan penghitung.
- Filter status, jenis layanan, dan pencarian nomor pengajuan/nama.
- Buka detail → **perhitungan SPPD otomatis** berdasarkan tarif.
- Ubah status (dengan LockService).
- Ekspor hasil filter ke CSV.

### Layar 4 — Hasil Uji
- Tabel per aksi: jumlah percobaan, median, persentil 75 (p75), target, dan status **Lulus/Tidak lulus**.
- Dapat difilter per perangkat (HP / laptop).
- Tombol **"Simulasi 20 pengguna bersamaan"**: menembakkan 20 permintaan baca-tulis paralel dan mencatat waktu tiap permintaan serta jumlah error.

## 5. Teknik Performa yang Wajib Diterapkan

1. Aplikasi satu halaman (HtmlService); pindah layar tanpa memuat ulang.
2. Baca/tulis Sheets per blok (`getValues`/`setValues`), tidak pernah per sel.
3. CacheService untuk master karyawan, tarif, dan daftar TAD (dipecah per potongan ≤ 100 KB).
4. Daftar TAD untuk saran nama dikirim sekali ke perangkat, lalu dicari di perangkat.
5. Tampilan optimistis saat Kirim dan ubah status.
6. LockService saat menulis.
7. Tanpa rumus di spreadsheet; semua perhitungan di kode.
8. Pengajuan dicari melalui indeks sederhana (mis. peta nomor pengajuan → nomor baris di cache), bukan memindai seluruh sheet setiap kali.

## 6. Pengukuran

Setiap aksi mencatat ke **LogKinerja**: nama aksi, waktu total yang dirasakan pengguna (diukur di browser), waktu proses server, jenis perangkat (HP/laptop), dan waktu uji.

| Aksi | Target (PRD 10.1) |
|---|---|
| Buka aplikasi pertama kali | ≤ 4 detik |
| Pindah layar / buka riwayat / buka detail | ≤ 1 detik |
| Kirim pengajuan (dirasakan pengguna) | ≤ 1 detik |
| Saran nama TAD muncul | ≤ 0,5 detik |
| Unggah dokumen 5 MB (4G) | ≤ 10 detik |
| Filter dan ekspor Admin | ≤ 3 detik |
| Buka detail + hitung SPPD (Admin) | ≤ 1 detik |
| Ubah status (Admin) | ≤ 1 detik (dirasakan) |

**Kriteria lulus:** nilai **p75** setiap aksi memenuhi target, dan simulasi 20 pengguna bersamaan berjalan **tanpa error**.

## 7. Pelaksanaan Uji

- Penguji minimal 3 orang, termasuk minimal 1 Admin SDM.
- Setiap aksi diulang minimal 30 kali total.
- Diuji di laptop kantor (jaringan kantor) dan HP (jaringan 4G).
- Uji dilakukan pada jam kerja biasa.

## 8. Di Luar Cakupan POC

Email, sinkronisasi HCMS, peran berbasis data asli, backup, tampilan sesuai Design System secara penuh.

## 9. Struktur Proyek

```
hcs-poc/
├── README.md              (cara setup, deploy, dan menjalankan uji)
├── .clasp.json
└── src/
    ├── appsscript.json    (webapp: executeAs USER_DEPLOYING, access DOMAIN)
    ├── Code.gs            (doGet, routing API)
    ├── Data.gs            (akses Sheets, cache, lock)
    ├── Dummy.gs           (generateDummyData)
    ├── Sppd.gs            (perhitungan SPPD)
    ├── Perf.gs            (LogKinerja, simulasi)
    ├── Index.html
    ├── App.js.html        (logika tampilan)
    └── Styles.css.html
```
