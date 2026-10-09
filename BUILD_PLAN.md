# Build Plan — HCS (Human Capital System)

| | |
|---|---|
| **Versi** | 2.0 (Disetujui) |
| **Tanggal** | 08-10-2026 |
| **Acuan** | PRD v2.1, Design Brief v1.1, mockup Claude Design (`mockup/`), Standar Keamanan v1.2 |
| **Status** | **Disetujui** pemilik proyek, 08-10-2026 |

Dokumen ini memecah pembangunan HCS menjadi **15 tahap kecil**. Setiap tahap bisa diselesaikan dan dicoba dalam 1–3 sesi kerja. Setiap tahap berisi tujuan, layar mockup yang dikerjakan, cara Anda mencobanya, tes keamanan, dan **prompt siap salin** untuk agen pembangun (Claude Code atau Antigravity).

---

## A. Aturan Main Setiap Sesi

1. **Satu sesi, satu tahap.** Agen tidak boleh mengerjakan tahap berikutnya sebelum tahap aktif lolos uji dan disetujui Anda.
2. **Awal sesi**, agen wajib membaca: `PROGRESS.md`, `BUILD_PLAN.md`, `docs/PRD_HCS_v2.1.md`, `docs/DESIGN_BRIEF.md`, `docs/STANDAR_KEAMANAN_HCS_v1.2.md`, dan layar mockup terkait di `mockup/`.
3. **Akhir sesi**, agen wajib:
   - menjalankan tes otomatis (fungsi + keamanan) dan melaporkan hasilnya dalam bahasa sederhana (aturan AI-04);
   - membuat commit Git dengan pesan rapi;
   - mencentang tahap di `BUILD_PLAN.md` dan memperbarui `PROGRESS.md`.
4. **Agen hanya memakai `hcs-dev`** (database percobaan berisi data dummy). Agen **tidak pernah** diberi kunci atau alamat database produksi (AI-01).
5. **Data asli tidak dipakai selama pembangunan.** File HCMS, rekening TAD, dan data karyawan asli baru diunggah Admin lewat aplikasi di produksi (Tahap 14). Selama pembangunan, agen membuat **file dummy dengan kolom yang sama**.
6. **Tampilan mengikuti mockup** semirip mungkin. Jika ada aturan PRD/Standar Keamanan yang bertentangan dengan mockup, PRD/Standar Keamanan yang menang, dan agen wajib memberi tahu Anda.
7. **Permintaan di luar PRD** dicatat di bagian F, tidak langsung dikerjakan.

## B. Keputusan Teknis untuk Pembangunan

Istilah dijelaskan singkat dalam kurung.

| Bagian | Pilihan | Alasan |
|---|---|---|
| Bahasa pemrograman | **TypeScript** (JavaScript dengan pemeriksaan tipe data) | Kesalahan ketik dan salah data tertangkap sebelum aplikasi dijalankan |
| Frontend (tampilan) | **Next.js** | Sesuai PRD |
| Backend (server pengolah data) | **Node.js + Express** | Sesuai PRD; satu-satunya pihak yang menyentuh database |
| Jalur frontend ↔ backend | Satu domain: semua alamat `/api/...` diteruskan Next.js ke Express | Cookie login lebih aman dan tidak perlu membuka akses lintas domain |
| Akses database | **Drizzle ORM** (penerjemah kode ke SQL yang aman) + file migrasi SQL di `database/migrations/` | Query selalu berparameter (INPUT-02); setiap perubahan struktur bisa direview (SUPA-16) |
| Skema database | `hcs` (bukan `public`), RLS tolak semua, peran khusus `hcs_app` | Standar Keamanan SUPA-07 s.d. 11 |
| Dokumen | Supabase Storage, bucket privat, diakses backend lewat *S3 access key* | Kunci service role tidak dipakai untuk kerja harian (SUPA-03) |
| Login | Tombol Google + verifikasi token di backend (`google-auth-library`) | AUTH-01, AUTH-02 |
| Sesi | Cookie `HttpOnly` + tabel sesi di database | AUTH-04 s.d. 06 |
| Validasi input | **zod** (pemeriksa format data) di backend | INPUT-01 |
| Pengamanan web | helmet (header keamanan), token CSRF, rate limit | WEB-02, WEB-03, RATE-01 |
| Enkripsi rekening | AES-256-GCM bawaan Node.js | DATA-01 |
| Email | Nodemailer + antrean email + node-cron (penjadwal) | PRD bagian 8 |
| Tampilan | CSS Modules + token warna/huruf dari `mockup/_ds/tokens/` | Sama persis dengan mockup; tanpa pustaka tampilan tambahan |
| Tes | Vitest + Supertest (tes fungsi dan tes hak akses); Playwright pada Tahap 6 perjalanan | Tes keamanan berjalan otomatis di setiap tahap |
| Pemeriksaan otomatis | GitHub Actions: tes, `npm audit`, `cek:rls`, pencarian kunci bocor | Gagal satu pemeriksaan, deploy tertahan |

**Asumsi** (dicek pada tahap yang disebut):
1. Cloudways Velocity dapat menjalankan dua layanan Node.js (Next.js dan Express) dalam satu aplikasi. Jika tidak, Express ditempatkan di subdomain `api.` dengan CORS terbatas (Tahap 14).
2. Kolom isian Pemesanan Tiket Pesawat mengikuti form Permohonan SPPD sampai Anda menetapkan rinciannya (Tahap 8).

## C. Yang Perlu Anda Siapkan Sebelum Tahap 1

| # | Persiapan | Biaya | Catatan |
|---|---|---|---|
| 1 | **Akun email khusus admin sistem HCS** (Gmail), verifikasi dua langkah aktif | Gratis | Dipakai mendaftar semua layanan di bawah |
| 2 | **Node.js versi LTS** dan **Git** terpasang di laptop | Gratis | Agen memandu pemasangan di Tahap 1 |
| 3 | **Akun GitHub** (dengan email admin sistem) | Gratis | Repo dibuat privat di Tahap 1 |
| 4 | **Proyek Supabase `hcs-dev`**, region Singapura | Gratis (paket Free) | Hanya untuk data dummy |
| 5 | **Project Google Cloud** untuk OAuth (tombol Sign in with Google) | Gratis, tanpa billing | Dibuat di Tahap 3, dipandu agen |

Yang **berbayar** (Cloudways, Supabase Pro untuk `hcs-prod`, dan domain) baru dibutuhkan di **Tahap 14**. Pembangunan Tahap 1–13 berjalan di laptop Anda tanpa biaya.

## D. Ringkasan 15 Tahap

| # | Tahap | Layar mockup | Status | Commit |
|---|---|---|---|---|
| 1 | Persiapan proyek dan Git | — | ✅ | `c6aa401` |
| 2 | Database aman dan bucket privat | — | ✅ | `d91bcf9` |
| 3 | Login Google, sesi, dan peran | U1, U2, U3 | 🟡 | |
| 4 | Data master: sinkronisasi HCMS dan unggah TAD | A5, A6 | ⬜ | |
| 5 | Klaim Biaya Perdin, termasuk bagian TAD | K1, K2, K3, K4 | ⬜ | |
| 6 | Klaim Biaya Perdin Diklat | K3 (varian Diklat) | ⬜ | |
| 7 | Permohonan SPPD dan Tugasku | K3 (varian SPPD), A2 | ⬜ | |
| 8 | Pemesanan Tiket Pesawat | K3 (varian Tiket) | ⬜ | |
| 9 | Perhitungan SPPD, penguncian data, nominal setelah Selesai | A3, K4 Selesai | ⬜ | |
| 10 | Deteksi duplikasi | A2, A3 (penanda) | ⬜ | |
| 11 | Halaman Admin lainnya: dasbor, semua pengajuan, tarif, audit, pengaturan | A1, A4, A7, A8, A9 | ⬜ | |
| 12 | Notifikasi email, lonceng, ringkasan harian | K5, lonceng Admin | ⬜ | |
| 13 | Pengujian keamanan lengkap, E2E, dan uji beban | — | ⬜ | |
| 14 | Deploy ke Cloudways + Supabase Pro, UAT, pilot | — | ⬜ | |
| 15 | Penyempurnaan tampilan dan dokumen serah terima | Semua | ⬜ | |

Legenda: ⬜ belum · 🟡 berjalan · ✅ selesai

**Urutan keamanan:** tahap 1–3 membangun "pagar" terlebih dahulu (database terkunci, login, pemeriksa peran). Fitur baru dibangun di dalam pagar itu, sehingga setiap endpoint (alamat API yang dipanggil tampilan) otomatis tertutup sejak awal.

---

## E. Rincian per Tahap

### Tahap 1 — Persiapan proyek dan Git

**Tujuan:** kerangka folder, Git, dan pemeriksaan otomatis siap sebelum ada fitur.

**Pekerjaan:**
- Repo GitHub **privat**, secret scanning (pendeteksi kunci bocor) dan Dependabot (pengingat pembaruan keamanan) aktif.
- Struktur monorepo: `frontend/`, `backend/`, `database/`, `docs/`, `mockup/`. Dokumen yang sudah disetujui dipindah ke `docs/`; dokumen arsip ke `docs/arsip/`.
- `.gitignore` memuat `node_modules/`, `.env*`, file Excel/CSV data asli.
- `.env.example` berisi daftar nama variabel **tanpa isi**.
- GitHub Actions dasar: instal, tes, `npm audit`, pencarian kunci bocor.
- Halaman awal kosong bertuliskan "HCS" memakai huruf Ronnia dan token warna dari `mockup/_ds/`.

**Cara Anda mencoba:** jalankan `npm run dev`, buka `http://localhost:3000`, terlihat tulisan HCS dengan huruf Ronnia. Di GitHub, tab Actions berwarna hijau.

**Tes keamanan:** repo privat; `.env` tidak ikut ter-commit; pencarian kunci bocor bersih.

**Prompt untuk agen:**
```
Baca PROGRESS.md, BUILD_PLAN.md (Tahap 1), dan STANDAR_KEAMANAN_HCS_v1.2.md.
Kerjakan HANYA Tahap 1 Build Plan:
1. Pandu saya memasang Node.js LTS dan Git bila belum ada (perintah lengkap untuk Windows).
2. Buat monorepo TypeScript: frontend/ (Next.js), backend/ (Express), database/, docs/, mockup/.
   Pindahkan dokumen yang disetujui ke docs/, dokumen arsip ke docs/arsip/.
3. Buat .gitignore (node_modules, .env*, *.xlsx, *.csv di luar folder contoh) dan .env.example tanpa nilai.
4. Siapkan GitHub Actions: install, test, npm audit (gagal bila high/critical), dan pemindai kunci bocor (gitleaks).
5. Halaman awal "HCS" memakai token dan font dari mockup/_ds/.
6. Pandu saya membuat repo GitHub PRIVAT, mengaktifkan secret scanning dan Dependabot, lalu push.
Jelaskan setiap perintah terminal dalam satu kalimat. Di akhir, laporkan hasil tes dan commit.
```

---

### Tahap 2 — Database aman dan bucket privat

**Tujuan:** 14 tabel PRD bagian 7.1 terbentuk di `hcs-dev` dengan lima lapis kunci Supabase aktif.

**Pekerjaan:**
- File migrasi pertama: membuat skema `hcs`, seluruh tabel PRD 7.1, `ENABLE` + `FORCE ROW LEVEL SECURITY` di setiap tabel tanpa policy, `REVOKE ALL` dari `anon` dan `authenticated` (termasuk default privileges).
- Peran database `hcs_app` dengan hak terbatas (tidak boleh DELETE pada tabel log, tidak boleh mengubah struktur).
- Skrip `npm run cek:rls`: gagal bila ada tabel tanpa RLS, tabel di `public`, atau policy yang membuka akses.
- Bucket Storage `dokumen` privat, batas 5 MB, hanya PDF/JPG/PNG.
- Data dummy (seed): 30 karyawan, 15 TAD, tarif SPPD dari PRD 5.5. **Rekening dummy terenkripsi.**
- Modul enkripsi AES-256-GCM dan tesnya.

**Yang Anda lakukan sendiri di dasbor Supabase `hcs-dev`** (dipandu agen, kunci produksi tidak pernah diberikan ke agen):
1. Matikan **Data API** (Project Settings → Data API).
2. Aktifkan **Enforce SSL**.
3. Matikan pendaftaran **Supabase Auth**.
4. Buat **S3 access key** untuk Storage dan simpan di `.env` laptop.

**Cara Anda mencoba:** agen menunjukkan hasil `npm run cek:rls` (semua hijau) dan Security Advisor Supabase (0 Error).

**Tes keamanan:** akses `/rest/v1/` dengan anon key → tidak tersedia; kolom rekening di database berupa teks acak, bukan angka.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 2, PRD bagian 5.5, 6, 7.1, dan STANDAR_KEAMANAN_HCS_v1.2.md bagian 7 dan 11.
Kerjakan HANYA Tahap 2 di Supabase hcs-dev:
1. Migrasi SQL di database/migrations/: skema hcs, 14 tabel PRD 7.1, ENABLE+FORCE RLS tanpa policy,
   REVOKE ALL dari anon/authenticated termasuk default privileges, peran hcs_app berhak terbatas.
2. Drizzle ORM dengan schema hcs; koneksi SSL memakai peran hcs_app.
3. Skrip npm run cek:rls sesuai aturan AI-02, ditambahkan ke GitHub Actions.
4. Modul enkripsi AES-256-GCM untuk rekening TAD + tes.
5. Seed dummy: 30 karyawan (12 kolom HCMS), 15 TAD (rekening dummy terenkripsi), tarif SPPD PRD 5.5.
   JANGAN membaca atau memakai file data asli.
6. Pandu saya mematikan Data API, mengaktifkan Enforce SSL, mematikan Supabase Auth signup,
   membuat bucket privat 'dokumen' (5 MB, PDF/JPG/PNG), dan membuat S3 access key.
Tunjukkan ringkasan "apa yang berubah di database" dalam bahasa sederhana (AI-05), hasil cek:rls, dan commit.
```

---

### Tahap 3 — Login Google, sesi, dan peran

**Tujuan:** hanya akun `@pegadaian.co.id` yang terdaftar yang bisa masuk; peran Karyawan dan Admin dipisah di backend.

**Layar:** U1 Masuk (tombol "Gunakan Email Corporate"), U1 error domain, U2 Akun belum terdaftar, U3 Sesi berakhir.

**Pekerjaan:**
- Pandu Anda membuat OAuth client di Google Cloud (tanpa billing).
- Verifikasi token Google di backend: tanda tangan, audience, masa berlaku, domain `hd = pegadaian.co.id`, email terverifikasi.
- Pencocokan email ke data master karyawan/pengguna aktif.
- Sesi cookie `HttpOnly`, `Secure`, `SameSite=Lax`; habis setelah 15 menit diam (dicek backend), maksimal 12 jam; keluar menghapus sesi di server.
- **Satu middleware hak akses** (pemeriksa peran di depan setiap endpoint), tolak secara bawaan.
- helmet, CSRF, rate limit login.
- Kerangka navigasi: bawah untuk karyawan (Pengajuan · Notifikasi · Profil), samping untuk Admin, sesuai mockup.

**Cara Anda mencoba:** masuk dengan email pegadaian.co.id → masuk ke beranda sesuai peran. Masuk dengan Gmail pribadi → muncul pesan domain. Diam 15 menit → layar Sesi berakhir.

**Tes keamanan (otomatis):** token palsu ditolak; akun luar domain ditolak; Karyawan memanggil endpoint Admin → ditolak; endpoint baru tanpa aturan → tertutup; percobaan login berulang → dibatasi.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 3, STANDAR_KEAMANAN_HCS_v1.2.md bagian 2, 3, 6, 9, dan layar U1–U3
di mockup/HCS Mobile.dc.html.
Kerjakan HANYA Tahap 3:
1. Pandu saya membuat OAuth Client ID di Google Cloud (tanpa billing), simpan di .env.
2. Login Google: verifikasi token di backend (signature, audience, exp, hd=pegadaian.co.id, email_verified),
   cocokkan email ke data master aktif.
3. Sesi cookie HttpOnly/Secure/SameSite=Lax di tabel sesi; idle 15 menit (backend), maks 12 jam; logout hapus sesi server.
4. Satu middleware peran (Karyawan/Admin), deny-by-default untuk semua route.
5. helmet, CSRF token, rate limit login per IP dan per email.
6. Layar U1, U1 error, U2, U3 dan kerangka navigasi karyawan/Admin, semirip mungkin dengan mockup.
7. Tes otomatis untuk semua kasus tolak di bagian "Tes keamanan" Tahap 3.
Laporkan hasil tes dalam bahasa sederhana, lalu commit.
```

---

### Tahap 4 — Data master: sinkronisasi HCMS dan unggah TAD

**Tujuan:** Admin dapat memperbarui data karyawan dan TAD sendiri, tanpa mengolah file.

**Layar:** A5 Data Karyawan + wizard Sinkronisasi HCMS (Unggah → Pemeriksaan → Ringkasan perubahan → Terapkan), A6 Data TAD + wizard unggah. A6 belum ada di mockup: dibangun dengan komponen A5.

**Pekerjaan:**
- Baca ekspor HCMS 93 kolom, **simpan hanya 12 kolom** (DATA-05); kolom lain dibuang sebelum disimpan.
- Ringkasan perubahan: baru, tidak ada lagi (dinonaktifkan, tidak dihapus), perubahan JG/golongan, pindah unit.
- Penentuan golongan dari KODE JOB GRADE (A ≥ 14, B 11–13, C 4–10); koreksi JG untuk Perdin dengan alasan wajib, tercatat di log, tidak tertimpa sinkronisasi.
- Unggah TAD: rapikan rekening, tolak rekening BRI bukan 15 digit, tandai NIK ganda/rekening kosong, ringkasan sebelum Terapkan; rekening disimpan terenkripsi dan tampil tersamar `••••1234`.
- Template TAD kosong dapat diunduh.
- Riwayat sinkronisasi dan indikator umur data.

**Cara Anda mencoba:** unggah file HCMS **dummy** buatan agen → lihat ringkasan perubahan → Terapkan → data tampil di tabel. Ulangi dengan file dummy yang kolomnya salah → muncul daftar kolom bermasalah.

**Tes keamanan:** Karyawan tidak bisa membuka A5/A6 atau API-nya; kolom sensitif HCMS (NIK KTP, NPWP, rekening, dll.) tidak tersimpan; file Excel berisi rumus berbahaya tidak dieksekusi; rekening tidak muncul utuh di respons API mana pun.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 4, PRD bagian 5.5 (golongan), 6.1–6.4, Design Brief A5/A6, dan layar A5
di mockup/HCS Admin.dc.html.
Kerjakan HANYA Tahap 4:
1. Buat file dummy HCMS (93 kolom, header sama dengan ekspor asli) dan template TAD dummy. JANGAN pakai data asli.
2. Wizard Sinkronisasi HCMS 4 langkah: simpan HANYA 12 kolom PRD 6.1, ringkasan perubahan, Terapkan,
   nonaktifkan (bukan hapus), catat riwayat.
3. Golongan dari KODE JOB GRADE; koreksi JG untuk Perdin (alasan wajib, log, tidak tertimpa sinkronisasi).
4. Wizard unggah TAD sesuai PRD 6.3, rekening terenkripsi, tampil ••••1234, unduh template kosong.
5. Halaman A5 semirip mockup; A6 memakai komponen yang sama.
6. Tes: akses Karyawan ditolak, kolom sensitif tidak tersimpan, rekening tidak pernah utuh di respons API.
Laporkan hasil tes, ringkasan perubahan database (AI-05), lalu commit.
```

---

### Tahap 5 — Klaim Biaya Perdin, termasuk bagian TAD

**Tujuan:** karyawan dapat mengajukan Klaim Perdin dari HP dari awal sampai terkirim, dan melacaknya.

**Layar:** K1 Pengajuan saya (isi, kosong, loading/error), K2 Pilih layanan, K3 form 6 langkah (Surat tugas → Perjalanan → Transportasi → TAD → Bukti → Tinjau dan kirim), K3 sukses, K4 Detail (Perlu revisi, Diproses, Ditolak), dialog Batalkan.

**Pekerjaan:**
- Form bertahap satu langkah per layar, **draf tersimpan otomatis**, validasi saat kolom ditinggalkan.
- Unggah dokumen: cek isi file (bukan nama), maks 5 MB, nama acak di bucket privat, gambar diperkecil sebelum diunggah.
- Bagian TAD sesuai PRD 5.7: saran nama setelah 3 huruf (nama, NIK tersamar, vendor, unit, **tanpa rekening**), TAD belum terdaftar, centang pernyataan.
- Nomor pengajuan (mis. KP-0123), status Draf → Dikirim, riwayat status.
- Edit dan kirim ulang saat Perlu revisi (nomor tetap); batalkan sebelum diproses.
- Admin dapat melihat daftar pengajuan sederhana untuk keperluan uji (Tugasku lengkap di Tahap 7).

**Cara Anda mencoba (dari HP di jaringan yang sama):** ajukan Klaim Perdin dengan 1 TAD → muncul layar sukses → status Dikirim di K1. Coba unggah file 6 MB → ditolak dengan pesan mockup.

**Tes keamanan:** Karyawan A tidak bisa membuka, mengubah, atau mengunduh dokumen milik Karyawan B (ganti nomor di alamat); respons saran TAD tidak memuat rekening; file `.pdf` palsu ditolak; dokumen tidak bisa dibuka tanpa login.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 5, PRD bagian 5.1–5.4, 5.7, 5.8, Design Brief bagian 5.1, 5.2, 6,
dan layar K1–K4 di mockup/HCS Mobile.dc.html.
Kerjakan HANYA Tahap 5 (Klaim Biaya Perdin):
1. K1, K2, K3 enam langkah, K3 sukses, K4 (Perlu revisi, Diproses, Ditolak), dialog batalkan, semirip mockup.
2. Draf otomatis, validasi saat blur, nomor pengajuan, status dan riwayat status.
3. Unggah dokumen sesuai FILE-01..05 dan SUPA-04 (magic bytes, 5 MB, nama acak, bucket privat, signed URL 5 menit).
4. Bagian TAD sesuai PRD 5.7; saran nama TANPA rekening (AKSES-04).
5. Edit+kirim ulang (nomor tetap) dan batalkan sebelum diproses.
6. Tes kepemilikan (Karyawan A vs B), tes respons tanpa rekening, tes file palsu dan file > 5 MB.
Laporkan hasil tes, lalu commit.
```

---

### Tahap 6 — Klaim Biaya Perdin Diklat

**Tujuan:** layanan kedua memakai mesin form yang sama, dengan Nomor Surat Pemanggilan Workshop/Diklat.

**Layar:** K3 varian Diklat (belum ada di mockup; memakai komponen K3).

**Cara Anda mencoba:** ajukan Klaim Perdin Diklat → nomor KD-xxxx, label "Surat Pemanggilan" di semua tempat.

**Tes keamanan:** tes kepemilikan dan unggah dari Tahap 5 diulang untuk layanan ini.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 6 dan PRD 5.1. Kerjakan HANYA Tahap 6:
tambahkan Klaim Biaya Perdin Diklat memakai mesin form Tahap 5, kunci Nomor Surat Pemanggilan
Workshop/Diklat, nomor KD-xxxx, label dan teks disesuaikan. Jangan menduplikasi kode form;
pakai konfigurasi per jenis layanan. Ulangi tes kepemilikan dan unggah. Laporkan hasil tes, lalu commit.
```

---

### Tahap 7 — Permohonan SPPD dan Tugasku

**Tujuan:** karyawan mengajukan SPPD sebelum berangkat; Admin punya antrean kerja harian.

**Layar:** K3 varian SPPD (tanpa langkah Bukti), A2 Tugasku (tab Karyawan | TAD, filter, cari, penanda), versi laptop dan HP.

**Pekerjaan:**
- Permohonan SPPD otomatis masuk Tugasku.
- Tugasku: tab Karyawan/TAD dengan penghitung, filter status/layanan/tanggal, cari nomor/nama/No. Surat Tugas, "Muat lebih banyak".
- Admin mengubah status: Proses, Minta revisi (catatan wajib), Tolak (alasan wajib); semua tercatat di riwayat.

**Cara Anda mencoba:** sebagai karyawan, ajukan SPPD; sebagai Admin, temukan di Tugasku, proses, lalu minta revisi; sebagai karyawan, lihat catatan oranye dan kirim ulang.

**Tes keamanan:** Karyawan tidak dapat mengubah status; perubahan status tanpa catatan/alasan ditolak backend; Tugasku tidak memuat rekening utuh.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 7, PRD 5.1–5.2, Design Brief A2, dan layar A2 di mockup/HCS Admin.dc.html.
Kerjakan HANYA Tahap 7: Permohonan SPPD (K3 tanpa langkah Bukti, nomor SP-xxxx) yang otomatis masuk
Tugasku; halaman A2 laptop dan HP semirip mockup; aksi Proses / Minta revisi (catatan wajib) /
Tolak (alasan wajib) dengan riwayat status. Tes: Karyawan tidak bisa ubah status, aksi tanpa catatan
ditolak backend. Laporkan hasil tes, lalu commit.
```

---

### Tahap 8 — Pemesanan Tiket Pesawat

**Tujuan:** karyawan meminta Admin memesankan tiket, terhubung ke Nomor Surat Tugas yang sama.

**Layar:** K3 varian Tiket, K4 Diproses (rute, tanggal, waktu).

**Butuh dari Anda sebelum mulai:** daftar kolom isian Pemesanan Tiket Pesawat (pertanyaan terbuka Design Brief). Jika belum ada, dipakai asumsi: rute, tanggal dan waktu berangkat, tanggal dan waktu kembali, catatan.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 8 dan PRD 5.1. Kerjakan HANYA Tahap 8: Pemesanan Tiket Pesawat (nomor TP-xxxx)
dengan kolom isian [diisi pemilik proyek], terhubung Nomor Surat Tugas, otomatis masuk Tugasku,
K4 menampilkan rute dan jadwal seperti mockup. Ulangi tes kepemilikan. Laporkan hasil tes, lalu commit.
```

---

### Tahap 9 — Perhitungan SPPD, penguncian data, nominal setelah Selesai

**Tujuan:** Admin menghitung SPPD otomatis per orang; karyawan melihat nominal setelah Selesai.

**Layar:** A3 Detail pengajuan Admin (dua kolom di laptop; tab Isian · Perhitungan · Dokumen · Riwayat di HP), K4 Selesai dengan nominal disetujui.

**Pekerjaan:**
- Hitung otomatis dari tabel `tarif_sppd` per golongan: uang harian menginap/tidak menginap, transportasi bandara, kendaraan dinas (100% / 50%), TAD 70% Golongan C, bantuan sewa rumah > 12 hari.
- Isian biaya at cost (hotel, tiket) oleh Admin; penyesuaian dengan alasan wajib, tercatat (siapa, kapan, nilai lama → baru).
- Penguncian data saat pengajuan dikirim (JG, golongan, jabatan, unit, bank dan rekening TAD).
- Lengkapi rekening TAD; tombol **Selesai nonaktif** jika rekening TAD kosong.
- Penampil dokumen di A3.
- K4 Selesai: total dan nominal per komponen untuk karyawan dan TAD-nya, **tanpa tarif per hari atau rumus** (AKSES-05).

**Cara Anda mencoba:** ambil 3 contoh perjalanan nyata yang sudah dibayar, masukkan ke HCS dengan data dummy setara, bandingkan hasil hitungan dengan hitungan manual Admin SDM.

**Tes keamanan:** respons API karyawan sebelum Selesai tidak memuat angka apa pun; setelah Selesai tidak memuat tarif atau rumus; nominal dari browser diabaikan dan dihitung ulang di backend (INPUT-03); penyesuaian tanpa alasan ditolak.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 9, PRD 5.5, 5.6, 5.7 (butir 8), 5.8, STANDAR AKSES-05, AKSES-06, INPUT-03,
dan layar A3 serta K4 Selesai di mockup.
Kerjakan HANYA Tahap 9:
1. Mesin hitung SPPD dari tabel tarif_sppd sesuai PRD 5.5 (termasuk TAD 70% Gol. C, kendaraan dinas,
   tidak menginap, sewa rumah > 12 hari) + tes unit untuk setiap aturan.
2. A3 laptop (dua kolom) dan HP (tab) semirip mockup: isian at cost, penyesuaian beralasan dan tercatat,
   lengkapi rekening TAD, tombol Selesai nonaktif bila rekening kosong, penampil dokumen.
3. Penguncian data saat kirim (PRD 5.6).
4. K4 Selesai: nominal per komponen dan total, tanpa tarif/rumus.
5. Tes kebocoran angka sebelum dan sesudah Selesai, tes hitung ulang di backend.
Sertakan tabel contoh hitungan agar dicocokkan Admin SDM. Laporkan hasil tes, lalu commit.
```

---

### Tahap 10 — Deteksi duplikasi

**Tujuan:** mencegah pembayaran ganda.

**Pekerjaan:** peringatan ke Admin untuk kombinasi Nomor Surat Tugas + karyawan + jenis layanan yang sudah aktif (tidak memblokir); **TAD hanya satu kali per Nomor Surat Tugas** dengan pesan *"TAD ini sudah diajukan dalam pengajuan [nomor]."* (dijaga juga oleh aturan unik di database); penanda di A2 dan A3.

**Tes:** dua karyawan menambahkan TAD yang sama di Surat Tugas yang sama → yang kedua ditolak, juga saat dikirim bersamaan.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 10 dan PRD 5.4. Kerjakan HANYA Tahap 10: peringatan duplikasi untuk Admin
(tidak memblokir), larangan TAD ganda per Nomor Surat Tugas dengan pesan PRD dan unique index di database,
penanda di A2/A3 seperti mockup. Tes termasuk dua permintaan bersamaan. Laporkan hasil tes, lalu commit.
```

---

### Tahap 11 — Halaman Admin lainnya

**Layar:** A1 Dasbor (umur data, kartu angka, daftar perhatian), A4 Semua Pengajuan (filter, total, ekspor CSV/Excel, cetak), A7 Tarif SPPD (berlaku mulai tanggal), A8 Log Audit (perubahan data, akses rekening, sinkronisasi), A9 Pengaturan (jam ringkasan, daftar Admin). A4, A7, A8, A9 belum ada di mockup: memakai komponen yang sudah ada.

**Tes keamanan:** ekspor dengan rekening lengkap memunculkan konfirmasi dan tercatat di `log_akses_rekening`; isian ekspor diawali `= + - @` dinetralkan (INPUT-04); log tidak dapat dihapus lewat aplikasi; Karyawan tidak dapat membuka halaman-halaman ini.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 11, Design Brief A1, A4, A7, A8, A9, PRD 6.2 (indikator umur data) dan 6.4.
Kerjakan HANYA Tahap 11: A1 semirip mockup; A4, A7, A8, A9 memakai komponen mockup yang ada.
Ekspor dengan rekening: dialog konfirmasi + log_akses_rekening; netralkan = + - @ di ekspor;
tarif berlaku mulai tanggal. Tes akses Karyawan ditolak dan tes log ekspor. Laporkan hasil tes, lalu commit.
```

---

### Tahap 12 — Notifikasi email, lonceng, ringkasan harian

**Layar:** K5 Notifikasi, lonceng Admin.

**Pekerjaan:** semua kejadian di PRD bagian 8; antrean email dengan percobaan ulang; ringkasan harian Tugasku hari kerja 08.00 WITA (jam bisa diubah di A9); pengingat sinkronisasi Senin dan harian jika data > 7 hari; subjek `[HCS] <Jenis Layanan> <Nomor> <status>`.

**Tes keamanan:** isi email **tidak memuat nominal, rekening, maupun lampiran**; tautan di email membawa ke halaman yang tetap meminta login.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 12 dan PRD bagian 8. Kerjakan HANYA Tahap 12: tabel notifikasi + K5 dan lonceng
Admin, antrean email Nodemailer (SMTP akun admin sistem, App Password di .env) dengan retry, node-cron
untuk ringkasan harian (jam dari pengaturan, WITA) dan pengingat sinkronisasi. Tes: isi email tanpa nominal,
rekening, atau lampiran. Laporkan hasil tes, lalu commit.
```

---

### Tahap 13 — Pengujian keamanan lengkap, E2E, dan uji beban

**Tujuan:** seluruh Standar Keamanan v1.2 bagian 12 terpenuhi sebelum menyentuh produksi.

**Pekerjaan:** checklist semua kode aturan (AUTH, AKSES, INPUT, FILE, WEB, DATA, DEP, RATE, SUPA, AI); pemindaian OWASP ZAP baseline; tes E2E Playwright untuk alur utama (ajukan → proses → revisi → selesai); uji beban 50 pengguna bersamaan dan target kecepatan PRD 9.1; hasil dicatat di `docs/LAPORAN_KEAMANAN.md`.

**Syarat lulus:** 0 temuan tinggi/kritis, semua tes hijau, target kecepatan tercapai.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 13 dan STANDAR_KEAMANAN_HCS_v1.2.md bagian 12. Kerjakan HANYA Tahap 13:
jalankan semua pengujian wajib, OWASP ZAP baseline, E2E Playwright alur utama, uji beban 50 pengguna
dan target PRD 9.1. Tulis docs/LAPORAN_KEAMANAN.md berisi checklist semua kode aturan (terpenuhi/belum)
dalam bahasa sederhana. Perbaiki temuan tinggi/kritis sebelum menyatakan selesai. Commit.
```

---

### Tahap 14 — Deploy ke Cloudways + Supabase Pro, UAT, pilot

**Butuh dari Anda sebelum mulai:** persetujuan/nota dinas Pemimpin Wilayah, pembayaran Cloudways dan Supabase Pro, domain, File web font Ronnia WOFF2 (bila sudah ada), template TAD final yang sudah divalidasi.

**Pekerjaan (Anda yang memegang kunci produksi, agen hanya memandu langkah):**
1. Buat proyek **`hcs-prod`** (Supabase Pro, Singapura), jalankan migrasi yang sama, ulangi pengaturan Tahap 2 (Data API mati, Enforce SSL, Auth signup mati, bucket privat).
2. Aktifkan **Network Restrictions**: hanya IP server Cloudways (SUPA-10).
3. Siapkan Cloudways Velocity (Singapura), isi environment variable produksi langsung di dasbor Cloudways, sambungkan deploy otomatis dari branch `main`.
4. Pasang domain dan HTTPS; daftarkan alamat domain di OAuth Google.
5. Jalankan **tes kebocoran Supabase** (Standar bagian 12 butir 7) terhadap produksi.
6. Admin SDM mengunggah ekspor HCMS dan template TAD **asli** lewat aplikasi.
7. **UAT** (uji terima) bersama Admin SDM memakai skenario nyata, lalu **pilot** dengan sekelompok karyawan sebelum dibuka untuk 873 karyawan.
8. Backup mingguan terenkripsi, pemantauan uptime, dan uji pemulihan pertama.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 14 dan STANDAR_KEAMANAN_HCS_v1.2.md bagian 10–12. Pandu saya langkah demi langkah
menyiapkan hcs-prod dan Cloudways. JANGAN meminta, menyimpan, atau menuliskan kunci produksi; saya yang
mengisinya langsung di dasbor. Siapkan skrip tes kebocoran produksi yang bisa saya jalankan sendiri,
daftar skenario UAT untuk Admin SDM, dan checklist pilot. Catat hasilnya di docs/LAPORAN_KEAMANAN.md.
```

---

### Tahap 15 — Penyempurnaan tampilan dan dokumen serah terima

**Pekerjaan:** perbaikan dari masukan UAT/pilot; pencocokan akhir setiap layar dengan mockup (warna, jarak, teks); panduan singkat untuk karyawan dan Admin SDM; runbook (panduan operasional): cara sinkronisasi, cara memulihkan backup, siapa yang dihubungi bila aplikasi bermasalah.

**Prompt untuk agen:**
```
Baca BUILD_PLAN.md Tahap 15. Bandingkan setiap layar aplikasi dengan mockup dan buat daftar selisihnya,
perbaiki satu per satu. Susun docs/PANDUAN_KARYAWAN.md, docs/PANDUAN_ADMIN.md, dan docs/RUNBOOK.md
dalam bahasa sederhana. Laporkan dan commit.
```

---

## F. Usulan di Luar MVP (dicatat, belum dikerjakan)

| Usulan | Sumber | Rencana |
|---|---|---|
| Pulse Check Karyawan | PRD Fase 2 | Konsep disusun dan disetujui terpisah setelah HCS Fase 1 berjalan |
| Desain Claude Design untuk layar A4, A6, A7, A8, A9 dan form Diklat/SPPD/Tiket | Hierarki acuan Design Brief | Opsional, dapat dibuat sebelum tahap terkait |

## G. Kriteria Tahap 3 (Bangun MVP) Selesai

- [ ] Build Plan disetujui dan ke-15 tahap berstatus ✅
- [ ] Semua alur PRD (4 layanan, Tugasku, perhitungan, data master, notifikasi) berjalan dari awal sampai akhir
- [ ] Login dan pembatasan per peran berjalan sesuai PRD dan Standar Keamanan
- [ ] Tampilan sesuai mockup Claude Design, termasuk kondisi kosong, loading, dan error
- [ ] Tidak ada rahasia di kode; `npm run cek:rls` dan pemindai kunci bocor bersih
- [ ] Semua pekerjaan ter-commit di GitHub
