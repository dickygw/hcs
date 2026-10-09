# Build Plan — HCS (Human Capital System)

| | |
|---|---|
| **Versi** | 3.0 (Disetujui) |
| **Tanggal** | 09-10-2026 |
| **Acuan** | PRD v2.2, Design Brief v1.1, mockup Claude Design (`mockup/`), Standar Keamanan v1.3 |
| **Platform** | Google Workspace Pegadaian: Apps Script, Sheets, Drive, MailApp |
| **Status** | **Disetujui** pemilik proyek, 09-10-2026 |

Build Plan v2.0 (jalur Cloudways + Supabase) tidak berlaku sejak keputusan IT Security pusat 09-10-2026; kodenya diarsipkan di cabang Git `arsip/jalur-server`.

Dokumen ini memecah pembangunan HCS menjadi **Tahap 0 (uji kecepatan) + 15 tahap**. Setiap tahap berisi tujuan, layar mockup, cara Anda mencoba, tes keamanan, dan **prompt siap salin** untuk agen pembangun.

---

## A. Aturan Main Setiap Sesi

1. **Satu sesi, satu tahap.** Agen tidak boleh mengerjakan tahap berikutnya sebelum tahap aktif lolos uji dan disetujui Anda.
2. **Awal sesi**, agen wajib membaca: `PROGRESS.md`, `BUILD_PLAN.md`, `docs/PRD_HCS_v2.2.md`, `docs/DESIGN_BRIEF.md`, `docs/STANDAR_KEAMANAN_HCS_v1.3.md`, dan layar mockup terkait.
3. **Akhir sesi**, agen wajib: menjalankan tes otomatis dan `npm run cek:keamanan`, melaporkan hasil dalam bahasa sederhana (AI-04), membuat commit, mencentang tahap, dan memperbarui `PROGRESS.md`.
4. **Agen hanya memakai HCS-dev** (data dummy). Rilis ke HCS-prod dilakukan pemegang akun unit sendiri (AI-01).
5. **Data asli tidak dipakai selama pembangunan.** File HCMS dan rekening TAD asli baru diunggah Admin lewat aplikasi di HCS-prod (Tahap 14).
6. **Tampilan mengikuti mockup** semirip mungkin. Jika bertentangan dengan PRD/Standar Keamanan, PRD/Standar yang menang dan agen memberi tahu Anda.
7. **Permintaan di luar PRD** dicatat di bagian F, tidak langsung dikerjakan.

## B. Keputusan Teknis untuk Pembangunan

| Bagian | Pilihan | Alasan |
|---|---|---|
| Bahasa | **TypeScript** (JavaScript dengan pemeriksaan tipe data) | Kesalahan ketik dan salah data tertangkap sebelum dikirim ke Apps Script |
| Kode server | `apps-script/src/` dibundel **esbuild** menjadi satu `Code.js`. Fungsi server didaftarkan di **satu daftar** bersama aturan perannya; pembungkus AKSES-01 dan fungsi top-level dibuat otomatis dari daftar itu | Tidak ada fungsi server yang lolos tanpa pemeriksa |
| Tampilan | **React + CSS Modules** di `tampilan/`, dibundel **Vite** menjadi satu `Index.html` untuk HtmlService | Komponen dan token warna dari mockup (dan dari arsip jalur server) dapat dipakai ulang |
| Kirim kode | **clasp** (alat resmi Google) ke **HCS-dev** saja | AI-01 |
| Akses data | Satu modul `data.ts`: baca sekaligus (`getValues`), olah di memori, tulis sekaligus (`setValues`), LockService, netralisasi rumus | PRD 9.1, INPUT-02, WS-07 |
| Validasi input | **zod** (dibundel) | INPUT-01 |
| Enkripsi rekening | AES-256-GCM dengan pustaka teraudit **@noble/ciphers** (dibundel); kunci di Script Properties | DATA-01, DATA-02 |
| Tes | **Vitest** untuk logika murni (hitung SPPD, validasi, pemeriksa akses dengan identitas tiruan); uji langsung di HCS-dev untuk bagian Google | Tes keamanan berjalan otomatis di setiap tahap |
| Pemeriksaan otomatis | GitHub Actions: typecheck, tes, build, `npm audit`, gitleaks, **`cek:keamanan`** | AI-02 |

**Struktur folder (setelah Tahap 1):**
```
D:\HCS
├─ apps-script/   kode server + appsscript.json + .clasp.json (HCS-dev)
├─ tampilan/      tampilan HP dan Admin (React), dibundel jadi Index.html
├─ alat/          skrip cek:keamanan dan pembuat fungsi top-level
├─ docs/  mockup/
└─ AGENTS.md  BUILD_PLAN.md  PROGRESS.md
```

## C. Yang Perlu Anda Siapkan Sebelum Tahap 0

| # | Persiapan | Catatan |
|---|---|---|
| 1 | Akun unit `manohc.balikpapan@pegadaian.co.id` dapat membuka script.google.com | ✅ Sudah dikonfirmasi |
| 2 | **Google Apps Script API** aktif untuk akun unit | https://script.google.com/home/usersettings |
| 3 | `clasp login` dengan akun unit di laptop (dipandu agen) | Token tersimpan di profil Windows, bukan di folder proyek |
| 4 | **3 penguji** untuk Tahap 0, minimal 1 Admin SDM, dengan HP (4G) dan laptop kantor | Untuk mengukur kecepatan nyata |

Tidak ada biaya.

## D. Ringkasan Tahap

| # | Tahap | Layar mockup | Status | Commit |
|---|---|---|---|---|
| 0 | Uji kecepatan (POC) | — | ✅ | lulus dengan catatan, `docs/HASIL_UJI_KECEPATAN.md` |
| 1 | Persiapan proyek Apps Script dan pemeriksaan otomatis | — | ✅ | `118409e` |
| 2 | Struktur spreadsheet, enkripsi rekening, data dummy | — | ✅ | `bb13f60` |
| 3 | Identitas, peran, kunci layar, kerangka navigasi | U2, U3, K6 | ⬜ | |
| 4 | Data master: sinkronisasi HCMS dan unggah TAD | A5, A6 | ⬜ | |
| 5 | Klaim Biaya Perdin, termasuk bagian TAD | K1–K4 | ⬜ | |
| 6 | Klaim Biaya Perdin Diklat | K3 (varian Diklat) | ⬜ | |
| 7 | Permohonan SPPD dan Tugasku | K3 (varian SPPD), A2 | ⬜ | |
| 8 | Pemesanan Tiket Pesawat | K3 (varian Tiket) | ⬜ | |
| 9 | Perhitungan SPPD, penguncian data, nominal setelah Selesai | A3, K4 Selesai | ⬜ | |
| 10 | Deteksi duplikasi | A2, A3 (penanda) | ⬜ | |
| 11 | Halaman Admin lainnya | A1, A4, A7, A8, A9 | ⬜ | |
| 12 | Notifikasi email, lonceng, ringkasan harian | K5, lonceng Admin | ⬜ | |
| 13 | Backup, arsip, pengujian keamanan lengkap, uji beban | — | ⬜ | |
| 14 | HCS-prod, UAT, pilot | — | ⬜ | |
| 15 | Penyempurnaan tampilan dan dokumen serah terima | Semua | ⬜ | |

Legenda: ⬜ belum · 🟡 berjalan · ✅ selesai

**Urutan keamanan:** tahap 1–3 membangun "pagar" terlebih dahulu (pemeriksa otomatis, sheet tertutup, pembungkus pemeriksa identitas dan peran). Fitur dibangun di dalam pagar itu, sehingga setiap fungsi server tertutup sejak awal.

---

## E. Rincian per Tahap

### Tahap 0 — Uji kecepatan (POC)

**Tujuan:** membuktikan dengan angka nyata bahwa Apps Script + Sheets memenuhi target PRD 9.1 pada volume data beberapa tahun, sebelum membangun penuh.

**Pekerjaan:** mengikuti `docs/arsip/SPEC_UJI_KECEPATAN_HCS.md` dengan penyesuaian berikut:
- Target diganti tabel PRD v2.2 bagian 9.1; teknik wajib PRD 9.1 (8 teknik) diterapkan.
- Data dummy: 873 karyawan, 1.346 TAD, 10.000 pengajuan (3 tahun), ±3.000 rincian TAD, ±35.000 riwayat status.
- Tiga layar uji (Riwayat Pengajuan, Form Klaim Perdin dengan saran TAD, Tugasku + hitung SPPD) dan layar Hasil Uji (median, p75, Lulus/Tidak lulus, simulasi 20 pengguna bersamaan).
- Proyek terpisah `HCS-POC` di akun unit; kode di folder `poc/`, **kode buangan** yang dihapus setelah lulus.

**Cara Anda mencoba:** 3 penguji memakai HP (4G) dan laptop kantor, masing-masing aksi diulang hingga total ≥ 30 kali, pada jam kerja.

**Syarat lulus:** p75 setiap aksi memenuhi target, simulasi 20 pengguna bersamaan tanpa error. **Tidak lulus** → agen menyusun laporan aksi yang gagal dan usulan perbaikan; Anda memutuskan langkah selanjutnya bersama IT pusat.

**Tes keamanan:** deployment POC hanya untuk domain Pegadaian (WS-01); sheet dan folder POC tidak dibagikan; tidak ada data asli.

**Prompt untuk agen:**
```
Baca PROGRESS.md, BUILD_PLAN.md (Tahap 0), PRD v2.2 bagian 7 dan 9, dan docs/arsip/SPEC_UJI_KECEPATAN_HCS.md.
Kerjakan HANYA Tahap 0:
1. Pandu saya mengaktifkan Apps Script API dan clasp login dengan akun unit.
2. Buat proyek HCS-POC (folder poc/) dengan clasp; appsscript.json executeAs USER_DEPLOYING, access DOMAIN.
3. Fungsi generateDummyData_ (volume sesuai Build Plan Tahap 0), tiga layar uji, layar Hasil Uji,
   dan LogKinerja, memakai 8 teknik wajib PRD 9.1.
4. Pandu saya deploy dan membagikan alamatnya ke 3 penguji; jelaskan cara menguji.
Setelah data uji terkumpul, laporkan hasil per aksi (median, p75, Lulus/Tidak) dalam bahasa sederhana, lalu commit.
```

---

### Tahap 1 — Persiapan proyek Apps Script dan pemeriksaan otomatis

**Tujuan:** kerangka proyek dan "pagar" otomatis siap sebelum ada fitur.

**Pekerjaan:**
- Hapus `frontend/`, `backend/`, `database/` dan `poc/` dari cabang utama (sudah ada di arsip); buat struktur folder bagian B.
- Proyek **HCS-dev** di akun unit lewat clasp; `appsscript.json` dengan `executeAs: USER_DEPLOYING`, `access: DOMAIN`, dan **daftar scope eksplisit** (WS-05).
- Bundel server (esbuild) dan tampilan (Vite, satu `Index.html`); perintah `npm run kirim:dev` = build + `clasp push` ke HCS-dev.
- **Daftar fungsi server + pembungkus pemeriksa** (AKSES-01) beserta pembuat fungsi top-level otomatis.
- **`npm run cek:keamanan`** (AI-02) dan GitHub Actions: typecheck, tes, build, `npm audit`, gitleaks, cek:keamanan.
- Halaman awal "HCS" memakai token warna dan huruf Ronnia dari `mockup/_ds/`.

**Cara Anda mencoba:** buka alamat deployment HCS-dev dengan akun kantor → tulisan HCS dengan huruf Ronnia. Buka dengan Gmail pribadi → ditolak Google. Tab Actions di GitHub hijau.

**Tes keamanan:** `cek:keamanan` gagal bila sengaja ditambah `doPost`, `setSharing`, `access: ANYONE`, atau fungsi tanpa pembungkus (diuji agen lalu dikembalikan); `.clasprc.json` dan `.env` tidak ter-commit.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 1 dan STANDAR_KEAMANAN_HCS_v1.3.md bagian 3, 6, 11.
Kerjakan HANYA Tahap 1:
1. Rapikan repo ke struktur bagian B (kode lama sudah di cabang arsip/jalur-server).
2. Buat proyek HCS-dev dengan clasp; appsscript.json sesuai WS-01 dan WS-05.
3. Bundel server (esbuild) dan tampilan React (Vite, satu Index.html); npm run kirim:dev.
4. Daftar fungsi server + pembungkus pemeriksa AKSES-01 + pembuat fungsi top-level.
5. npm run cek:keamanan sesuai AI-02 dan GitHub Actions lengkap.
6. Halaman awal HCS dengan token dan font dari mockup/_ds/.
Buktikan cek:keamanan menangkap pelanggaran yang disengaja. Laporkan hasil, lalu commit.
```

---

### Tahap 2 — Struktur spreadsheet, enkripsi rekening, data dummy

**Tujuan:** tabel PRD 7.1 terbentuk di HCS-dev, tertutup, dan rekening terenkripsi.

**Pekerjaan:**
- Fungsi migrasi bernomor (`migrasi_0001_`) membuat spreadsheet `HCS_Master`, `HCS_Data`, `HCS_Log` dan seluruh sheet PRD 7.1 dengan kolom yang sama; ID disimpan di Script Properties (WS-06); kolom teks diformat teks (INPUT-02).
- Modul `data.ts` (bagian B) dan tesnya.
- Modul enkripsi AES-256-GCM + tes; kunci dibuat di Script Properties oleh Anda (dipandu agen).
- Data dummy: 30 karyawan, 15 TAD (rekening terenkripsi), tarif SPPD PRD 5.5, jenis layanan.
- **`cekBerbagi_`** (WS-03) dan trigger mingguan.

**Yang Anda lakukan sendiri:** membuat kunci enkripsi di Script Properties HCS-dev (dipandu agen; agen tidak melihat nilainya).

**Cara Anda mencoba:** buka spreadsheet HCS-dev dengan akun unit → kolom rekening berupa teks acak; jalankan `cekBerbagi_` → 0 file dibagikan.

**Tes keamanan:** isian `=IMPORTXML(...)` tersimpan sebagai teks; rekening tidak pernah tersimpan sebagai angka; `cekBerbagi_` menangkap file yang sengaja dibagikan (lalu dicabut).

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 2, PRD 5.5, 6, 7.1, STANDAR v1.3 bagian 4, 7, 11.
Kerjakan HANYA Tahap 2 di HCS-dev:
1. Fungsi migrasi_0001_ membuat 3 spreadsheet dan semua sheet PRD 7.1; ID di Script Properties.
2. Modul data.ts (baca/tulis sekaligus, LockService, netralisasi rumus) + tes.
3. Enkripsi AES-256-GCM (@noble/ciphers) + tes; pandu saya membuat kunci di Script Properties.
4. Data dummy: 30 karyawan, 15 TAD terenkripsi, tarif SPPD, jenis layanan. JANGAN pakai data asli.
5. cekBerbagi_ + trigger mingguan.
Beri ringkasan "apa yang berubah di struktur data" (AI-05), hasil tes, lalu commit.
```

---

### Tahap 3 — Identitas, peran, kunci layar, kerangka navigasi

**Tujuan:** hanya email Pegadaian yang terdaftar dapat memakai HCS; peran Karyawan dan Admin dipisah di server.

**Layar:** U2 Akun belum terdaftar, U3 Sesi berakhir, K6 Profil, kerangka navigasi karyawan (bawah di HP, atas di laptop) dan Admin (samping di laptop, bawah di HP). U1 tidak dipakai (PRD 7.3).

**Pekerjaan:**
- Identitas dari `Session.getActiveUser().getEmail()` di setiap panggilan; pencocokan ke `pengguna`/`karyawan` aktif (AUTH-02, AUTH-03).
- Sesi HCS di CacheService: diam 15 menit, maksimal 12 jam; Keluar menghapus sesi server (AUTH-05, AUTH-06).
- Batas jumlah panggilan per email (AUTH-07, RATE-01).
- Cache browser di memori, dihapus saat Keluar dan terkunci (WEB-06).
- Fungsi pendaftaran Admin pertama dijalankan akun unit dari editor (`tambahAdmin_`).

**Cara Anda mencoba:** daftarkan `dicky.widyatama@pegadaian.co.id` sebagai Admin → buka HCS → Dasbor Admin. Email kantor lain yang tidak terdaftar → U2. Diam 15 menit → U3.

**Tes keamanan (otomatis):** email dari browser diabaikan; email tidak terdaftar ditolak; Karyawan memanggil fungsi Admin → ditolak; fungsi baru tanpa aturan → tertutup; sesi lewat 15 menit → `sesi_berakhir`; fungsi berakhiran `_` tidak terdaftar sebagai fungsi server.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 3, STANDAR v1.3 bagian 2, 3, 6, dan layar U2, U3, K6, navigasi di mockup.
Kerjakan HANYA Tahap 3:
1. Identitas dari Session.getActiveUser() di pembungkus AKSES-01; cocokkan ke pengguna/karyawan aktif.
2. Sesi HCS di CacheService (15 menit diam, maks 12 jam), Keluar menghapus sesi server, batas per email.
3. Layar U2, U3, K6 dan kerangka navigasi karyawan/Admin semirip mockup; cache browser sesuai WEB-06.
4. tambahAdmin_ untuk Admin pertama.
5. Tes otomatis untuk semua kasus tolak di bagian "Tes keamanan" Tahap 3.
Laporkan hasil tes dalam bahasa sederhana, lalu commit.
```

---

### Tahap 4 — Data master: sinkronisasi HCMS dan unggah TAD

**Tujuan:** Admin dapat memperbarui data karyawan dan TAD sendiri, tanpa mengolah file.

**Layar:** A5 Data Karyawan + wizard Sinkronisasi HCMS (Unggah → Pemeriksaan → Ringkasan perubahan → Terapkan), A6 Data TAD + wizard unggah (komponen A5).

**Pekerjaan:** baca file ekspor HCMS di server, **simpan hanya 12 kolom** (DATA-05) dan buang file aslinya; ringkasan perubahan; golongan dari KODE JOB GRADE; koreksi JG untuk Perdin beralasan dan tercatat; unggah TAD dengan validasi rekening BRI 15 digit, terenkripsi, tampil `••••1234`; template TAD kosong; riwayat sinkronisasi dan indikator umur data. Daftar dikirim per halaman (PRD 9.1).

**Cara Anda mencoba:** unggah file HCMS **dummy** buatan agen → ringkasan → Terapkan. File dummy dengan kolom salah → daftar kolom bermasalah. Ukur waktu sinkronisasi ±900 baris.

**Tes keamanan:** Karyawan tidak dapat memanggil fungsi A5/A6; kolom sensitif HCMS tidak tersimpan; isian berawalan `=` tersimpan sebagai teks; rekening tidak muncul utuh di balasan fungsi mana pun.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 4, PRD 5.5 (golongan), 6.1–6.4, Design Brief A5/A6, layar A5 di mockup.
Kerjakan HANYA Tahap 4:
1. File dummy HCMS (93 kolom, header sama dengan ekspor asli) dan template TAD dummy. JANGAN pakai data asli.
2. Wizard Sinkronisasi HCMS 4 langkah: simpan HANYA 12 kolom, ringkasan, Terapkan, nonaktifkan (bukan hapus), riwayat.
3. Golongan dari KODE JOB GRADE; koreksi JG beralasan dan tercatat.
4. Wizard unggah TAD sesuai PRD 6.3, rekening terenkripsi, tampil ••••1234, unduh template kosong.
5. A5 semirip mockup; A6 memakai komponen yang sama; daftar per halaman.
6. Tes: akses Karyawan ditolak, kolom sensitif tidak tersimpan, rekening tidak pernah utuh, rumus dinetralkan.
Laporkan hasil tes, ringkasan perubahan struktur data (AI-05), lalu commit.
```

---

### Tahap 5 — Klaim Biaya Perdin, termasuk bagian TAD

**Tujuan:** karyawan dapat mengajukan Klaim Perdin dari HP dari awal sampai terkirim, dan melacaknya.

**Layar:** K1 Pengajuan saya (isi, kosong, loading/error), K2 Pilih layanan, K3 form 6 langkah, K3 sukses, K4 Detail (Perlu revisi, Diproses, Ditolak), dialog Batalkan.

**Pekerjaan:** form bertahap, draf tersimpan di server, validasi saat kolom ditinggalkan; unggah dokumen (cek isi file di server, maks 5 MB, nama acak, folder privat, foto diperkecil di perangkat); bagian TAD sesuai PRD 5.7 (saran nama dicari di perangkat, **tanpa rekening**); nomor pengajuan, status, riwayat; edit dan kirim ulang; batalkan sebelum diproses. Satu panggilan per layar dan tampilan optimistis (PRD 9.1).

**Cara Anda mencoba (dari HP):** ajukan Klaim Perdin dengan 1 TAD → layar sukses → status Dikirim di K1. Unggah file 6 MB → ditolak.

**Tes keamanan:** Karyawan A tidak dapat membuka, mengubah, atau mengunduh dokumen Karyawan B (ganti nomor/ID); daftar saran TAD tanpa rekening; file `.pdf` palsu ditolak server; tidak ada file Drive yang dibagikan setelah unggah.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 5, PRD 5.1–5.4, 5.7, 5.8, 9.1, Design Brief 5.1, 5.2, 6, layar K1–K4 di mockup.
Kerjakan HANYA Tahap 5 (Klaim Biaya Perdin):
1. K1, K2, K3 enam langkah, K3 sukses, K4, dialog batalkan, semirip mockup.
2. Draf di server, validasi saat blur, nomor pengajuan, status dan riwayat; satu panggilan per layar.
3. Unggah dokumen sesuai FILE-01..05 (magic bytes di server, 5 MB, nama acak, folder privat, tanpa berbagi).
4. Bagian TAD sesuai PRD 5.7; saran nama tanpa rekening, dicari di perangkat.
5. Edit+kirim ulang (nomor tetap) dan batalkan sebelum diproses.
6. Tes kepemilikan (A vs B), tes tanpa rekening, tes file palsu dan > 5 MB.
Laporkan hasil tes, lalu commit.
```

---

### Tahap 6 — Klaim Biaya Perdin Diklat

**Tujuan:** layanan kedua memakai mesin form yang sama, dengan Nomor Surat Pemanggilan Workshop/Diklat.

**Cara Anda mencoba:** ajukan Klaim Perdin Diklat → nomor KD-xxxx, label "Surat Pemanggilan" di semua tempat.

**Tes keamanan:** tes kepemilikan dan unggah Tahap 5 diulang.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 6 dan PRD 5.1. Kerjakan HANYA Tahap 6: Klaim Biaya Perdin Diklat memakai mesin
form Tahap 5 lewat konfigurasi per jenis layanan (jangan menduplikasi kode), Nomor Surat Pemanggilan,
nomor KD-xxxx. Ulangi tes kepemilikan dan unggah. Laporkan hasil tes, lalu commit.
```

---

### Tahap 7 — Permohonan SPPD dan Tugasku

**Layar:** K3 varian SPPD (tanpa langkah Bukti), A2 Tugasku (tab Karyawan | TAD, filter, cari, penanda), laptop dan HP.

**Pekerjaan:** Permohonan SPPD otomatis masuk Tugasku; tab dengan penghitung, filter, cari, "Muat lebih banyak" (per halaman); aksi Proses, Minta revisi (catatan wajib), Tolak (alasan wajib) dengan LockService dan riwayat status.

**Cara Anda mencoba:** sebagai karyawan ajukan SPPD; sebagai Admin temukan di Tugasku, proses, minta revisi; sebagai karyawan lihat catatan oranye dan kirim ulang.

**Tes keamanan:** Karyawan tidak dapat mengubah status; aksi tanpa catatan/alasan ditolak server; dua Admin mengubah status bersamaan tidak saling menimpa.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 7, PRD 5.1–5.2, Design Brief A2, layar A2 di mockup.
Kerjakan HANYA Tahap 7: Permohonan SPPD (K3 tanpa langkah Bukti, nomor SP-xxxx) otomatis masuk Tugasku;
A2 laptop dan HP semirip mockup, per halaman; aksi Proses / Minta revisi / Tolak dengan LockService dan riwayat.
Tes: Karyawan tidak bisa ubah status, aksi tanpa catatan ditolak, dua Admin bersamaan. Laporkan, lalu commit.
```

---

### Tahap 8 — Pemesanan Tiket Pesawat

**Butuh dari Anda sebelum mulai:** daftar kolom isian Pemesanan Tiket Pesawat. Jika belum ada: rute, tanggal dan waktu berangkat, tanggal dan waktu kembali, catatan.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 8 dan PRD 5.1. Kerjakan HANYA Tahap 8: Pemesanan Tiket Pesawat (TP-xxxx) dengan kolom
[diisi pemilik proyek], terhubung Nomor Surat Tugas, otomatis masuk Tugasku, K4 menampilkan rute dan jadwal
seperti mockup. Ulangi tes kepemilikan. Laporkan hasil tes, lalu commit.
```

---

### Tahap 9 — Perhitungan SPPD, penguncian data, nominal setelah Selesai

**Layar:** A3 Detail pengajuan Admin (dua kolom di laptop; tab Isian · Perhitungan · Dokumen · Riwayat di HP), K4 Selesai.

**Pekerjaan:** mesin hitung SPPD dari `tarif_sppd` (uang harian menginap/tidak, transportasi bandara, kendaraan dinas 100%/50%, TAD 70% Gol. C, sewa rumah > 12 hari) + tes unit setiap aturan; isian at cost; penyesuaian beralasan dan tercatat; penguncian data saat dikirim (PRD 5.6); lengkapi rekening TAD; **Selesai nonaktif** bila rekening kosong; penampil dokumen; K4 Selesai tanpa tarif/rumus.

**Cara Anda mencoba:** 3 contoh perjalanan nyata yang sudah dibayar dimasukkan dengan data dummy setara; hasil dibandingkan dengan hitungan manual Admin SDM.

**Tes keamanan:** balasan fungsi karyawan sebelum Selesai tanpa angka; sesudah Selesai tanpa tarif/rumus; nominal dari browser diabaikan (INPUT-03); penyesuaian tanpa alasan ditolak.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 9, PRD 5.5–5.8, STANDAR AKSES-05, AKSES-06, INPUT-03, layar A3 dan K4 Selesai.
Kerjakan HANYA Tahap 9: mesin hitung SPPD + tes unit tiap aturan; A3 laptop dan HP; at cost, penyesuaian
beralasan dan tercatat; lengkapi rekening TAD; Selesai nonaktif bila rekening kosong; penguncian data saat kirim;
K4 Selesai tanpa tarif/rumus. Tes kebocoran angka dan hitung ulang di server. Sertakan tabel contoh hitungan
untuk dicocokkan Admin SDM. Laporkan, lalu commit.
```

---

### Tahap 10 — Deteksi duplikasi

**Pekerjaan:** peringatan ke Admin untuk Nomor Surat Tugas + karyawan + jenis layanan yang sudah aktif (tidak memblokir); **TAD hanya satu kali per Nomor Surat Tugas** dengan pesan *"TAD ini sudah diajukan dalam pengajuan [nomor]."*, diperiksa ulang di dalam LockService (INPUT-05); penanda di A2 dan A3.

**Tes:** dua karyawan menambahkan TAD yang sama di Surat Tugas yang sama → yang kedua ditolak, juga saat dikirim bersamaan.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 10 dan PRD 5.4. Kerjakan HANYA Tahap 10: peringatan duplikasi untuk Admin, larangan
TAD ganda per Nomor Surat Tugas (pesan PRD, diperiksa di dalam LockService), penanda di A2/A3.
Tes termasuk dua kiriman bersamaan. Laporkan hasil tes, lalu commit.
```

---

### Tahap 11 — Halaman Admin lainnya

**Layar:** A1 Dasbor, A4 Semua Pengajuan (filter, total, ekspor CSV/Excel, cetak), A7 Tarif SPPD (berlaku mulai tanggal), A8 Log Audit, A9 Pengaturan (jam ringkasan, daftar Admin).

**Tes keamanan:** ekspor dengan rekening lengkap → konfirmasi + `log_akses_rekening`; isian ekspor diawali `= + - @` dinetralkan; log tidak dapat diubah lewat aplikasi; Karyawan tidak dapat memanggil fungsi halaman ini; ekspor ≤ 3 detik untuk filter umum.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 11, Design Brief A1, A4, A7, A8, A9, PRD 6.2 dan 6.4.
Kerjakan HANYA Tahap 11: A1 semirip mockup; A4, A7, A8, A9 memakai komponen yang ada. Ekspor dengan rekening:
dialog konfirmasi + log_akses_rekening; netralkan = + - @; tarif berlaku mulai tanggal; daftar Admin di A9.
Tes akses Karyawan ditolak dan tes log ekspor. Laporkan hasil tes, lalu commit.
```

---

### Tahap 12 — Notifikasi email, lonceng, ringkasan harian

**Layar:** K5 Notifikasi, lonceng Admin.

**Pekerjaan:** semua kejadian PRD bagian 8; `antrean_email` diproses trigger dengan percobaan ulang (MailApp, akun unit); ringkasan harian hari kerja 08.00 WITA (jam dari A9); pengingat sinkronisasi; subjek `[HCS] <Jenis Layanan> <Nomor> <status>`; kuota email harian dipantau.

**Tes keamanan:** isi email tanpa nominal, rekening, maupun lampiran; hanya ke alamat `@pegadaian.co.id` terdaftar (WS-09); tautan di email membuka HCS yang tetap memeriksa identitas.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 12 dan PRD bagian 8. Kerjakan HANYA Tahap 12: notifikasi + K5 dan lonceng Admin;
antrean email MailApp dengan retry via trigger; ringkasan harian (jam dari pengaturan, WITA); pengingat
sinkronisasi. Tes: email tanpa nominal/rekening/lampiran, hanya ke alamat terdaftar. Laporkan, lalu commit.
```

---

### Tahap 13 — Backup, arsip, pengujian keamanan lengkap, uji beban

**Pekerjaan:** backup harian (salinan spreadsheet, simpan 30 hari) dan uji pemulihan pertama (OPS-03, OPS-04); pemindahan pengajuan > 90 hari ke `HCS_Arsip_[tahun]`; pemberitahuan error trigger ke akun unit (OPS-05); seluruh pengujian Standar v1.3 bagian 12; uji beban 20 pengguna bersamaan dan target PRD 9.1 diukur ulang dengan fitur lengkap; hasil dicatat di `docs/LAPORAN_KEAMANAN.md`.

**Syarat lulus:** 0 temuan tinggi/kritis, semua tes hijau, target kecepatan tercapai.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 13 dan STANDAR v1.3 bagian 10–12. Kerjakan HANYA Tahap 13: backup harian + uji
pemulihan, arsip > 90 hari, notifikasi error trigger, semua pengujian wajib bagian 12, uji beban 20 pengguna
dan target PRD 9.1. Tulis docs/LAPORAN_KEAMANAN.md (checklist semua kode aturan, bahasa sederhana).
Perbaiki temuan tinggi/kritis sebelum menyatakan selesai. Commit.
```

---

### Tahap 14 — HCS-prod, UAT, pilot

**Butuh dari Anda sebelum mulai:** nota dinas Pemimpin Wilayah, orang kedua pemegang akun unit (OPS-01), template TAD final yang sudah divalidasi, file web font Ronnia WOFF2 (bila sudah ada).

**Pekerjaan (Anda yang memegang HCS-prod, agen hanya memandu langkah):**
1. Anda membuat proyek **HCS-prod** dan menjalankan fungsi migrasi yang sama; membuat kunci enkripsi prod di Script Properties (berbeda dari dev).
2. Anda men-deploy versi bernomor; periksa WS-14 (Execute as akun unit, akses pegadaian.co.id).
3. Jalankan `cekBerbagi_` dan tes akses luar (Gmail pribadi ditolak) terhadap prod.
4. Admin SDM mengunggah ekspor HCMS dan template TAD **asli** lewat aplikasi.
5. **UAT** bersama Admin SDM dengan skenario nyata, lalu **pilot** dengan sekelompok karyawan sebelum dibuka untuk 873 karyawan.
6. Aktifkan trigger backup, pemberitahuan error, dan uji pemulihan pertama di prod.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 14 dan STANDAR v1.3 bagian 10–12. Pandu saya langkah demi langkah menyiapkan HCS-prod.
JANGAN meminta, menyimpan, atau menuliskan ID skrip, spreadsheet, folder, atau kunci prod; saya yang mengerjakannya
di akun unit. Siapkan checklist rilis (WS-14), daftar skenario UAT untuk Admin SDM, dan checklist pilot.
Catat hasilnya di docs/LAPORAN_KEAMANAN.md.
```

---

### Tahap 15 — Penyempurnaan tampilan dan dokumen serah terima

**Pekerjaan:** perbaikan dari masukan UAT/pilot; pencocokan akhir setiap layar dengan mockup; panduan singkat karyawan (termasuk cara membuka HCS bila browser memakai banyak akun Google, PRD 9.6) dan Admin SDM; runbook: sinkronisasi, rilis versi baru, memulihkan backup, rotasi kunci, siapa yang dihubungi.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 15. Bandingkan setiap layar dengan mockup dan buat daftar selisihnya, perbaiki satu
per satu. Susun docs/PANDUAN_KARYAWAN.md, docs/PANDUAN_ADMIN.md, dan docs/RUNBOOK.md dalam bahasa sederhana.
Laporkan dan commit.
```

---

## F. Usulan di Luar MVP (dicatat, belum dikerjakan)

| Usulan | Sumber | Rencana |
|---|---|---|
| Pulse Check Karyawan | PRD Fase 2 | Konsep disusun dan disetujui terpisah setelah HCS Fase 1 berjalan |
| Desain Claude Design untuk layar A4, A6, A7, A8, A9 dan form Diklat/SPPD/Tiket | Hierarki acuan Design Brief | Opsional, dapat dibuat sebelum tahap terkait |
| Migrasi ke database bila volume atau kecepatan tidak lagi memadai | PRD 7.1 (struktur data disamakan) | Hanya dengan persetujuan IT pusat |

## G. Kriteria Tahap 3 PROGRESS (Bangun MVP) Selesai

- [ ] Build Plan v3.0 disetujui dan Tahap 0–15 berstatus ✅
- [ ] Semua alur PRD (4 layanan, Tugasku, perhitungan, data master, notifikasi) berjalan dari awal sampai akhir
- [ ] Identitas dan pembatasan per peran berjalan sesuai PRD dan Standar Keamanan v1.3
- [ ] Tampilan sesuai mockup, termasuk kondisi kosong, loading, dan error
- [ ] Target kecepatan PRD 9.1 tercapai
- [ ] Tidak ada rahasia di kode; `cek:keamanan` dan `cekBerbagi_` bersih
- [ ] Semua pekerjaan ter-commit di GitHub
