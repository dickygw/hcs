# Standar Keamanan HCS

| | |
|---|---|
| **Versi** | 1.3 (Disetujui 09-10-2026) |
| **Tanggal** | 09-10-2026 |
| **Berlaku untuk** | Seluruh kode HCS (fungsi server Apps Script, tampilan, struktur spreadsheet) |
| **Platform** | Google Workspace Pegadaian: Apps Script Web App, Google Sheets, Google Drive, MailApp |
| **Sifat** | **Wajib.** Setiap aturan harus dipenuhi sebelum HCS dipakai karyawan. |

> Instruksi untuk agen pembangun (Claude Code): baca dokumen ini sebelum menulis kode apa pun. Jika sebuah permintaan bertentangan dengan standar ini, berhenti dan tanyakan kepada pemilik proyek. Setiap aturan memiliki kode (mis. AUTH-01) agar dapat dirujuk saat review dan pengujian.

### Riwayat versi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | 06-10-2026 | Standar awal |
| 1.1 | 06-10-2026 | Disesuaikan dengan Cloudways Velocity + Supabase |
| 1.2 | 08-10-2026 | Pengetatan Supabase (temuan UpGuard), aturan agen AI |
| **1.3** | 09-10-2026 | **Platform diganti ke Google Workspace Pegadaian** (PRD v2.2). Bagian Supabase dan Cloudways diganti aturan Workspace (WS-01 s.d. WS-14). Login dan sesi disesuaikan dengan login Google bawaan Apps Script. Ditambah risiko khas Apps Script: fungsi server yang dapat dipanggil browser, rumus di sel spreadsheet, dan berbagi file Drive. Prinsip dasar, hak akses (AKSES), dan aturan agen AI tetap. |

---

## 1. Prinsip Dasar

1. **Jangan pernah percaya pada browser.** Semua pemeriksaan (identitas, peran, kepemilikan data, validasi) dilakukan di fungsi server Apps Script. Menyembunyikan tombol di tampilan bukan pengamanan.
2. **Tolak secara bawaan.** Fungsi server baru tertutup sampai aturan aksesnya ditulis secara eksplisit.
3. **Kirim data seminimal mungkin.** Fungsi server hanya mengirim kolom yang dibutuhkan layar tersebut, setelah disaring.
4. **Data sensitif dienkripsi.** Spreadsheet yang bocor atau terbuka tidak boleh berarti kebocoran data sensitif.
5. **Tidak ada yang dibagikan.** Spreadsheet, folder, dan proyek kode hanya dimiliki akun unit. Semua orang, termasuk Admin SDM, bekerja melalui HCS.

Istilah: **fungsi server** = fungsi Apps Script yang dapat dipanggil dari tampilan melalui `google.script.run`. Fungsi ini setara dengan "endpoint" pada aplikasi web biasa.

## 2. Identitas dan Sesi

| Kode | Aturan |
|---|---|
| AUTH-01 | Login ditangani Google Workspace. Web app di-deploy dengan **Execute as: akun pemilik** dan **Who has access: hanya pengguna di pegadaian.co.id**. Dilarang memakai akses "Anyone" atau "Anyone with Google account". |
| AUTH-02 | Identitas pengguna **hanya** diambil di server dari `Session.getActiveUser().getEmail()` pada setiap panggilan. Email, NIK, atau peran yang dikirim dari browser **tidak pernah** dipercaya. Email kosong atau bukan `@pegadaian.co.id` → tolak. |
| AUTH-03 | Email harus terdaftar dan aktif di tabel `pengguna` atau data master `karyawan`; jika tidak, tampilkan "Akun Anda belum terdaftar di HCS. Silakan hubungi Admin SDM." |
| AUTH-04 | Browser tidak menyimpan apa pun yang dipakai sebagai bukti hak akses. Peran yang tersimpan di tampilan hanya untuk mengatur menu; server tetap memeriksa ulang. |
| AUTH-05 | HCS terkunci setelah **15 menit tanpa aktivitas** dan maksimal **12 jam** sejak dibuka. Waktu aktivitas dicatat di **server** (CacheService per pengguna); panggilan setelah batas ditolak dengan kode `sesi_berakhir` sampai pengguna menekan **Masuk kembali**. |
| AUTH-06 | Tombol **Keluar** menghapus catatan sesi HCS di server. Tampilan menjelaskan bahwa akun Google tetap masuk di browser, dan menyarankan keluar dari akun Google di perangkat bersama. |
| AUTH-07 | Aksi sensitif (kirim pengajuan, unggah, ekspor, ubah status) dibatasi jumlahnya per email per menit di server. |

## 3. Hak Akses (risiko terbesar HCS)

| Kode | Aturan |
|---|---|
| AKSES-01 | **Setiap** fungsi server melewati **satu pembungkus pemeriksa** yang sama (identitas, sesi, peran, batas jumlah) sebelum logikanya berjalan. Fungsi yang tidak boleh dipanggil browser **wajib diakhiri garis bawah** (`namaFungsi_`) agar tidak dapat dipanggil lewat `google.script.run`. |
| AKSES-02 | Karyawan hanya dapat membaca, mengubah, dan membatalkan **pengajuan miliknya sendiri**. Penyaringan kepemilikan dilakukan di server **sebelum** data disusun untuk dikirim; dilarang mengirim seluruh isi sheet lalu menyaringnya di browser. |
| AKSES-03 | Nomor pengajuan dan ID file tidak boleh menjadi satu-satunya pengaman. Mengganti nomor atau ID yang dikirim dari browser tidak boleh membuka data orang lain. |
| AKSES-04 | **Nomor rekening TAD tidak pernah dikirim ke peran Karyawan** dalam bentuk apa pun, termasuk di daftar saran nama, detail pengajuan, maupun pesan error. |
| AKSES-05 | Tarif, rumus, dan hasil perhitungan SPPD **tidak dikirim ke Karyawan** sebelum status Selesai. Setelah Selesai, yang dikirim hanya **nominal yang disetujui per komponen dan total** (untuk karyawan itu dan TAD yang ia tambahkan), tanpa tarif per hari maupun rumus (mis. "3 × Rp410.000" tidak boleh dikirim). |
| AKSES-06 | Perubahan status, penyesuaian nominal, koreksi JG, dan pelengkapan rekening hanya untuk Admin dan selalu tercatat di log (siapa, kapan, nilai lama, nilai baru). |
| AKSES-07 | Data Pulse Check (fase 2) mengikuti aturan khusus yang ditetapkan sebelum fitur dibangun; minimal: jawaban per orang tidak dapat dilihat atasan, dan rekap hanya tampil jika jumlah responden memenuhi batas minimum. |

## 4. Validasi Input dan Data

| Kode | Aturan |
|---|---|
| INPUT-01 | Setiap input divalidasi di server dengan skema: tipe, panjang, format, nilai yang diizinkan. Input di luar skema ditolak. |
| INPUT-02 | **Tidak ada rumus dari input.** Setiap teks dari pengguna atau file unggahan yang ditulis ke sheet disimpan sebagai teks biasa: isian yang diawali `= + - @` dinetralkan sebelum ditulis, dan kolom teks diformat sebagai teks. Sheet HCS tidak memakai rumus sama sekali. |
| INPUT-03 | Nominal dan tanggal dihitung ulang di server; nilai dari browser tidak dipercaya. |
| INPUT-04 | Ekspor CSV/Excel menetralkan isian yang diawali `= + - @` agar tidak dieksekusi sebagai rumus. |
| INPUT-05 | Penulisan data memakai **LockService** agar dua pengguna tidak saling menimpa; aturan unik (mis. satu TAD per Nomor Surat Tugas) diperiksa ulang di dalam kunci. |

## 5. Unggah Dokumen

| Kode | Aturan |
|---|---|
| FILE-01 | Hanya PDF, JPG, PNG. Jenis file diperiksa di server dari isi file (magic bytes), bukan dari nama. |
| FILE-02 | Ukuran maksimal 5 MB per file; diperiksa di server, bukan hanya di browser. |
| FILE-03 | File disimpan di folder privat milik akun unit, dengan nama acak. Nama asli hanya disimpan sebagai data. |
| FILE-04 | File hanya dapat dibuka melalui fungsi server yang memeriksa AKSES-02 (pemilik atau Admin). |
| FILE-05 | File **tidak pernah dibagikan**: dilarang `setSharing`, tautan "siapa saja yang memiliki link", atau menambah editor/pembaca. Tidak ada tautan permanen ke file. |

## 6. Perlindungan Tampilan (Browser)

| Kode | Aturan |
|---|---|
| WEB-01 | Dilarang menyisipkan HTML dari input pengguna (`innerHTML`, `dangerouslySetInnerHTML`, atau scriptlet tanpa escape `<?!= ?>` untuk data pengguna). |
| WEB-02 | Halaman tidak boleh disematkan situs lain: `setXFrameOptionsMode` tetap bawaan (dilarang `ALLOWALL`). Seluruh skrip dan gaya dibundel di dalam aplikasi; tidak memuat skrip dari situs luar. |
| WEB-03 | Data hanya dipertukarkan lewat `google.script.run` (terikat ke akun Google pengguna). **Tidak ada `doPost`** dan `doGet` tidak mengembalikan data berdasarkan parameter alamat. |
| WEB-04 | Tidak ada API publik: dilarang `ContentService` yang mengembalikan data, dan dilarang men-deploy proyek sebagai *API executable*. |
| WEB-05 | Pesan error ke pengguna bersifat umum; detail teknis hanya di log Apps Script. |
| WEB-06 | **Cache di browser** hanya di memori halaman (variabel JavaScript). Dilarang menyimpan data pengajuan, data pribadi, atau data Admin di `localStorage`, `sessionStorage`, IndexedDB, atau cookie. Cache dihapus saat Keluar dan saat layar terkunci (AUTH-05). Cache hanya berisi data yang sudah lolos penyaringan server untuk pengguna itu, sehingga tidak pernah memuat rekening untuk Karyawan. Draf form boleh disimpan di server (sheet), bukan di browser. |

## 7. Data Sensitif dan Rahasia

| Kode | Aturan |
|---|---|
| DATA-01 | Nomor rekening TAD dan jawaban Pulse Check **dienkripsi di level aplikasi** (AES-256-GCM) sebelum ditulis ke sheet, memakai pustaka kriptografi yang sudah diaudit dan dibundel ke kode. |
| DATA-02 | Kunci enkripsi disimpan di **Script Properties** proyek, dibuat langsung di sana oleh pemegang akun unit. Dilarang ada di kode, Git, sheet, atau file yang ikut di-commit. Kunci dev dan prod berbeda. |
| DATA-03 | Repositori GitHub bersifat **privat**, dengan secret scanning aktif. Token login clasp (`.clasprc.json`) dan `.env` tidak pernah di-commit. |
| DATA-04 | Log (Logger, console, `log_kinerja`) tidak boleh memuat nomor rekening, isi dokumen, atau jawaban Pulse Check. |
| DATA-05 | Hanya 12 kolom HCMS yang ditetapkan PRD yang boleh tersimpan; kolom lain dibuang **sebelum** ditulis ke sheet. File HCMS asli yang diunggah tidak disimpan. |

## 8. Dependensi dan Pembaruan

| Kode | Aturan |
|---|---|
| DEP-01 | `npm audit` dijalankan sebelum setiap rilis; temuan tingkat tinggi/kritis wajib diperbaiki. |
| DEP-02 | Dependabot aktif di GitHub untuk pembaruan keamanan. |
| DEP-03 | Versi paket dikunci dengan `package-lock.json`. |
| DEP-04 | Tidak menambah paket baru tanpa alasan yang dicatat; utamakan paket populer dan terawat. |
| DEP-05 | Dilarang memakai **Library Apps Script pihak ketiga** (dimuat lewat Script ID). Kode luar hanya boleh masuk sebagai paket npm yang dibundel dan lolos DEP-01. |

## 9. Batas Permintaan

| Kode | Aturan |
|---|---|
| RATE-01 | Batas jumlah panggilan per email di server untuk semua fungsi, lebih ketat untuk unggah, kirim pengajuan, dan ekspor. |
| RATE-02 | Batas ukuran isi panggilan di server (mis. unggahan maks 5 MB, teks isian sesuai skema). |

## 10. Akun Unit dan Operasional

| Kode | Aturan |
|---|---|
| OPS-01 | Seluruh proyek Apps Script, spreadsheet, folder, dan trigger dimiliki **akun unit** `manohc.balikpapan@pegadaian.co.id`, verifikasi dua langkah aktif, akses dipegang **minimal dua orang** yang tercatat di PROGRESS.md. |
| OPS-02 | Rilis ke HCS-prod hanya dari branch `main` setelah semua pengujian lulus, sebagai **versi deployment bernomor** (bukan alamat `/dev`). Alamat `/dev` tidak dibagikan ke siapa pun. |
| OPS-03 | Backup otomatis harian (salinan spreadsheet) ke folder backup privat milik akun unit, disimpan 30 hari. |
| OPS-04 | Uji pemulihan backup minimal sekali per tiga bulan. |
| OPS-05 | Kegagalan trigger dan error server dikirim ke email akun unit; `log_kinerja` ditinjau mingguan. |

## 11. Google Workspace

### 11.1 Lapis kunci HCS di Workspace
Kebocoran aplikasi Apps Script umumnya terjadi karena spreadsheet atau folder dibagikan terlalu luas, web app di-deploy untuk "Anyone", atau fungsi server tidak memeriksa siapa pemanggilnya. HCS menutup risiko ini dengan **lima lapis kunci**:

| Lapis | Kunci | Aturan |
|---|---|---|
| 1 | Hanya akun Pegadaian yang dapat membuka HCS | AUTH-01, WS-01 |
| 2 | Spreadsheet dan folder tidak dibagikan ke siapa pun | WS-03, WS-04, FILE-05 |
| 3 | Setiap fungsi server memeriksa identitas, peran, dan kepemilikan | AKSES-01, AKSES-02 |
| 4 | Izin kode dibatasi seminimal mungkin | WS-05 |
| 5 | Data paling sensitif terenkripsi, jadi terbuka pun tidak terbaca | DATA-01 |

### 11.2 Aturan

| Kode | Aturan |
|---|---|
| WS-01 | `appsscript.json` wajib memuat `"executeAs": "USER_DEPLOYING"` dan `"access": "DOMAIN"`. Pemeriksaan otomatis gagal jika berbeda. |
| WS-02 | Proyek **dipisah**: `HCS-dev` (spreadsheet dan folder berisi data dummy) dan `HCS-prod` (data asli), masing-masing dengan spreadsheet, folder, dan Script Properties sendiri. Data asli **dilarang** disalin ke HCS-dev. |
| WS-03 | Spreadsheet dan folder HCS **tidak dibagikan** ke akun lain, termasuk Admin SDM. Pemeriksaan otomatis berkala (`cekBerbagi_`) melaporkan setiap file HCS yang memiliki editor, pembaca, atau tautan selain akun unit. |
| WS-04 | Proyek kode Apps Script hanya dapat diedit pemegang akun unit. Tidak ada editor tambahan, karena editor dapat membaca Script Properties. |
| WS-05 | Izin (OAuth scope) ditulis eksplisit di `appsscript.json` dan dibatasi yang diperlukan: spreadsheet, Drive, kirim email, dan email pengguna. Dilarang scope membaca Gmail, Kalender, atau Kontak. |
| WS-06 | Fungsi server membuka spreadsheet dan folder memakai **ID yang disimpan di Script Properties**, bukan ID yang dikirim dari browser. |
| WS-07 | Seluruh nilai sel ditulis dan dibaca **per blok** melalui satu modul akses data; modul ini yang menerapkan INPUT-02 dan INPUT-05. |
| WS-08 | Cache (CacheService) hanya berisi data yang boleh dilihat pemanggilnya atau data master **tanpa rekening**. Rekening, terenkripsi sekalipun, tidak disimpan di cache bersama. |
| WS-09 | Email dikirim hanya ke alamat `@pegadaian.co.id` yang terdaftar, dari akun unit, tanpa nominal, rekening, maupun lampiran. |
| WS-10 | Trigger hanya dibuat oleh akun unit dan dicatat di dokumentasi (nama fungsi, jadwal, tujuan). |
| WS-11 | Folder dokumen dan backup tidak diletakkan di Shared Drive yang anggotanya bukan pemegang akun unit. |
| WS-12 | Riwayat versi spreadsheet tidak dijadikan satu-satunya backup (OPS-03 tetap wajib). |
| WS-13 | Perubahan struktur sheet (tambah/ubah kolom) **hanya melalui fungsi migrasi bernomor** di kode (mis. `migrasi_0002_`) yang ikut di-commit dan direview; dilarang mengubah struktur sheet produksi dengan tangan. |
| WS-14 | Sebelum setiap rilis, pengaturan deployment diperiksa langsung di editor Apps Script: Execute as **Me (akun unit)**, Who has access **pegadaian.co.id**. |

### 11.3 Aturan khusus untuk agen AI (vibe coding)

| Kode | Aturan |
|---|---|
| AI-01 | Agen AI (Claude Code atau sejenis) **tidak pernah** bekerja di `HCS-prod`: ID skrip, ID spreadsheet, dan ID folder produksi **tidak disimpan** di repositori maupun laptop pengembangan. Rilis ke prod dilakukan pemegang akun unit sendiri. Agen hanya boleh `clasp push` ke `HCS-dev`. |
| AI-02 | Pemeriksaan otomatis `npm run cek:keamanan` wajib lulus di GitHub Actions sebelum rilis. Pemeriksaan gagal jika: WS-01 dilanggar; ada fungsi server tanpa pembungkus AKSES-01; ada `doPost`, `ContentService`, `setSharing`, `ALLOWALL`, `<?!=` untuk data pengguna, atau `innerHTML`; ada scope di luar WS-05. |
| AI-03 | Agen tidak boleh membuat fungsi server tanpa pembungkus AKSES-01, membagikan file, melonggarkan deployment, atau menonaktifkan pemeriksaan keamanan untuk "mempercepat". Jika diminta, agen berhenti dan bertanya kepada pemilik proyek. |
| AI-04 | Setiap selesai satu tahap pembangunan, agen menjalankan tes keamanan otomatis (bagian 12) dan melaporkan hasilnya dalam bahasa sederhana sebelum lanjut ke tahap berikutnya. |
| AI-05 | Pemilik proyek menerima ringkasan "apa yang berubah di struktur data" untuk setiap fungsi migrasi, dalam bahasa sederhana, sebelum dijalankan di produksi. |

## 12. Pengujian Keamanan Wajib Sebelum Rilis

1. **Tes otomatis hak akses:** Karyawan A mencoba membuka, mengubah, dan mengunduh dokumen pengajuan Karyawan B (mengganti nomor/ID yang dikirim) → harus ditolak. Karyawan memanggil fungsi Admin → harus ditolak. Fungsi berakhiran `_` tidak dapat dipanggil dari browser.
2. **Tes kebocoran data:** periksa isi balasan fungsi server untuk peran Karyawan; tidak boleh ada kolom rekening, tarif, atau nominal (sebelum Selesai).
3. **Tes unggah:** file berekstensi `.pdf` yang isinya bukan PDF, dan file > 5 MB → harus ditolak oleh server.
4. **Tes rumus:** isian `=IMPORTXML(...)`, `+1+1`, `@SUM(...)` tersimpan sebagai teks biasa di sheet dan di hasil ekspor.
5. **Tes sesi:** setelah 15 menit diam, panggilan berikutnya ditolak dengan `sesi_berakhir`.
6. **Tes akses luar:** membuka alamat HCS dengan akun Gmail pribadi → ditolak Google; email Pegadaian yang tidak terdaftar → layar U2.
7. **Tes berbagi:** `cekBerbagi_` melaporkan 0 file HCS yang dibagikan; pengaturan deployment sesuai WS-14.
8. **`npm audit`** bersih dari temuan tinggi/kritis, dan **`npm run cek:keamanan`** lulus.
9. **Checklist review:** seluruh kode aturan di dokumen ini ditandai terpenuhi.

Hasil pengujian dicatat di `docs/LAPORAN_KEAMANAN.md` untuk setiap rilis.
