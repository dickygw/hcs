# Standar Keamanan HCS

| | |
|---|---|
| **Versi** | 1.2 |
| **Tanggal** | 08-10-2026 |
| **Berlaku untuk** | Seluruh kode HCS (frontend, backend, database) |
| **Platform** | Cloudways Velocity (aplikasi) + Supabase (database dan dokumen) |
| **Sifat** | **Wajib.** Setiap aturan harus dipenuhi sebelum deploy ke produksi. |

> Instruksi untuk agen pembangun (Claude Code): baca dokumen ini sebelum menulis kode apa pun. Jika sebuah permintaan bertentangan dengan standar ini, berhenti dan tanyakan kepada pemilik proyek. Setiap aturan memiliki kode (mis. AUTH-01) agar dapat dirujuk saat review dan pengujian.

### Riwayat versi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | 06-10-2026 | Standar awal |
| 1.1 | 06-10-2026 | Disesuaikan dengan Cloudways Velocity + Supabase |
| **1.2** | 08-10-2026 | **Pengetatan Supabase** setelah temuan UpGuard (akhir September 2026): 16.326 database Supabase terbuka untuk umum, banyak di antaranya aplikasi hasil vibe coding. Ditambahkan aturan SUPA-07 s.d. SUPA-16, aturan khusus agen AI (AI-01 s.d. AI-05), dan pengujian kebocoran Supabase. AKSES-05 diperjelas sesuai mockup Claude Design. |


---

## 1. Prinsip Dasar

1. **Jangan pernah percaya pada browser.** Semua pemeriksaan (login, peran, kepemilikan data, validasi) dilakukan di backend. Menyembunyikan tombol di tampilan bukan pengamanan.
2. **Tolak secara bawaan.** Endpoint baru tertutup sampai aturan aksesnya ditulis secara eksplisit.
3. **Kirim data seminimal mungkin.** Backend hanya mengirim kolom yang dibutuhkan layar tersebut.
4. **Data sensitif dienkripsi.** Kebocoran database tidak boleh berarti kebocoran data sensitif.

## 2. Login dan Sesi

| Kode | Aturan |
|---|---|
| AUTH-01 | Login hanya melalui "Sign in with Google". Token Google **diverifikasi di backend** (tanda tangan, audience, masa berlaku). |
| AUTH-02 | Hanya akun dengan domain terverifikasi `pegadaian.co.id` (klaim `hd` dan email terverifikasi) yang diterima. |
| AUTH-03 | Email harus terdaftar dan aktif di data master Karyawan atau Pengguna; jika tidak, tampilkan "Akun Anda belum terdaftar di HCS". |
| AUTH-04 | Sesi disimpan di cookie `HttpOnly`, `Secure`, `SameSite=Lax`. Token tidak boleh disimpan di localStorage. |
| AUTH-05 | Sesi berakhir setelah **15 menit tanpa aktivitas** (dicek di backend) dan maksimal 12 jam. |
| AUTH-06 | Tombol keluar menghapus sesi di backend, bukan hanya di browser. |
| AUTH-07 | Percobaan login dibatasi (rate limit) per IP dan per email. |

## 3. Hak Akses (risiko terbesar HCS)

| Kode | Aturan |
|---|---|
| AKSES-01 | **Setiap** endpoint memeriksa peran (Karyawan/Admin) di backend melalui satu middleware yang sama. |
| AKSES-02 | Karyawan hanya dapat membaca, mengubah, dan membatalkan **pengajuan miliknya sendiri**. Pemeriksaan kepemilikan dilakukan di query database (`WHERE pemilik = pengguna_login`), bukan setelah data diambil. |
| AKSES-03 | Nomor pengajuan dan ID file tidak boleh menjadi satu-satunya pengaman. Mengganti angka di URL tidak boleh membuka data orang lain. |
| AKSES-04 | **Nomor rekening TAD tidak pernah dikirim ke peran Karyawan** dalam bentuk apa pun, termasuk di daftar saran nama, detail pengajuan, maupun pesan error. |
| AKSES-05 | Tarif, rumus, dan hasil perhitungan SPPD **tidak dikirim ke Karyawan** sebelum status Selesai. Setelah Selesai, yang dikirim hanya **nominal yang disetujui per komponen dan total** (untuk karyawan itu dan TAD yang ia tambahkan), tanpa tarif per hari maupun rumus (mis. "3 × Rp410.000" tidak boleh dikirim). |
| AKSES-06 | Perubahan status, penyesuaian nominal, koreksi JG, dan pelengkapan rekening hanya untuk Admin dan selalu tercatat di log (siapa, kapan, nilai lama, nilai baru). |
| AKSES-07 | Data Pulse Check (fase 2) mengikuti aturan khusus yang ditetapkan sebelum fitur dibangun; minimal: jawaban per orang tidak dapat dilihat atasan, dan rekap hanya tampil jika jumlah responden memenuhi batas minimum. |

## 4. Validasi Input dan Database

| Kode | Aturan |
|---|---|
| INPUT-01 | Setiap input divalidasi di backend dengan skema (mis. zod): tipe, panjang, format, nilai yang diizinkan. Input di luar skema ditolak. |
| INPUT-02 | Akses database **hanya** melalui ORM atau query berparameter. Dilarang menyusun SQL dengan menggabungkan teks. |
| INPUT-03 | Nominal dan tanggal dihitung ulang di backend; nilai dari browser tidak dipercaya. |
| INPUT-04 | Ekspor CSV/Excel menetralkan isian yang diawali `= + - @` agar tidak dieksekusi sebagai rumus. |

## 5. Unggah Dokumen

| Kode | Aturan |
|---|---|
| FILE-01 | Hanya PDF, JPG, PNG. Jenis file diperiksa dari isi file (magic bytes), bukan dari nama. |
| FILE-02 | Ukuran maksimal 5 MB per file; dibatasi juga di level server. |
| FILE-03 | File disimpan dengan nama acak, di luar folder publik. Nama asli hanya disimpan sebagai data. |
| FILE-04 | File hanya dapat diunduh melalui endpoint yang memeriksa AKSES-02 (pemilik atau Admin). |
| FILE-05 | Tidak ada tautan permanen yang dapat dibuka tanpa login. |

## 6. Perlindungan Tampilan (Browser)

| Kode | Aturan |
|---|---|
| WEB-01 | Dilarang memakai `dangerouslySetInnerHTML` atau menyisipkan HTML dari input pengguna. |
| WEB-02 | Header keamanan aktif (mis. helmet): Content-Security-Policy, X-Frame-Options/frame-ancestors, X-Content-Type-Options, Referrer-Policy, HSTS. |
| WEB-03 | Perlindungan CSRF untuk semua permintaan yang mengubah data (SameSite cookie + token CSRF). |
| WEB-04 | CORS hanya mengizinkan domain HCS sendiri. |
| WEB-05 | Pesan error ke pengguna bersifat umum; detail teknis hanya di log server. |

## 7. Data Sensitif dan Rahasia

| Kode | Aturan |
|---|---|
| DATA-01 | Nomor rekening TAD dan jawaban Pulse Check **dienkripsi di level aplikasi** (AES-256-GCM) sebelum disimpan ke database. |
| DATA-02 | Kunci enkripsi, client secret Google, password database, dan App Password email disimpan sebagai **environment variable di Cloudways**. Dilarang ada di kode, Git, atau file yang ikut di-commit. |
| DATA-03 | File `.env` masuk `.gitignore`. Repositori GitHub bersifat **privat**, dengan secret scanning aktif. |
| DATA-04 | Log tidak boleh memuat nomor rekening, token, isi dokumen, atau jawaban Pulse Check. |
| DATA-05 | Hanya 12 kolom HCMS yang ditetapkan PRD yang boleh tersimpan; kolom lain dibuang saat unggah. |

## 8. Dependensi dan Pembaruan

| Kode | Aturan |
|---|---|
| DEP-01 | `npm audit` dijalankan sebelum setiap deploy; temuan tingkat tinggi/kritis wajib diperbaiki. |
| DEP-02 | Dependabot (atau sejenis) aktif di GitHub untuk pembaruan keamanan. |
| DEP-03 | Versi paket dikunci dengan `package-lock.json`. |
| DEP-04 | Tidak menambah paket baru tanpa alasan yang dicatat; utamakan paket populer dan terawat. |

## 9. Batas Permintaan dan Ketersediaan

| Kode | Aturan |
|---|---|
| RATE-01 | Rate limit untuk seluruh API, lebih ketat untuk login, unggah file, dan ekspor. |
| RATE-02 | Batas ukuran body permintaan di backend. |

## 10. Akun Cloudways dan Operasional

| Kode | Aturan |
|---|---|
| OPS-01 | Akun Cloudways didaftarkan dengan **email unit SDM**, verifikasi dua langkah aktif, akses dipegang minimal dua orang. |
| OPS-02 | Deploy hanya dari branch `main` di GitHub setelah semua pengujian lulus. |
| OPS-03 | Backup otomatis Cloudways aktif; ditambah ekspor database **terenkripsi** mingguan yang disimpan di luar Cloudways. |
| OPS-04 | Uji pemulihan backup minimal sekali per tiga bulan. |
| OPS-05 | Pemantauan uptime dengan notifikasi email ke PIC. |

## 11. Supabase

### 11.1 Mengapa bagian ini paling ketat
Pada akhir September 2026, UpGuard menemukan **16.326 database Supabase** yang tabelnya dapat dibaca siapa saja. Penyebab utamanya:
1. Browser terhubung langsung ke Supabase memakai *anon key* (kunci publik), sementara pengamanan tabel (Row Level Security/RLS) tidak aktif.
2. Tabel yang dibuat lewat kode atau agen AI **tidak otomatis** mendapat RLS. Hanya tabel yang dibuat lewat Table Editor di dasbor yang mendapat RLS secara bawaan.
3. RLS aktif tetapi aturannya terlalu longgar.
4. Pemilik aplikasi tidak memahami konfigurasi database yang dibuat agen AI.

HCS menutup risiko ini dengan **lima lapis kunci**. Satu lapis gagal, lapis lain tetap menahan:

| Lapis | Kunci | Aturan |
|---|---|---|
| 1 | Browser tidak pernah bicara dengan Supabase | SUPA-01 |
| 2 | Pintu API publik Supabase dimatikan | SUPA-02, SUPA-07 |
| 3 | Tabel menolak semua akses walau pintu terbuka | SUPA-08, SUPA-09 |
| 4 | Database hanya menerima koneksi dari server HCS, dengan akun berhak terbatas | SUPA-10, SUPA-11 |
| 5 | Data paling sensitif terenkripsi, jadi bocor pun tidak terbaca | DATA-01 |

### 11.2 Aturan

| Kode | Aturan |
|---|---|
| SUPA-01 | Browser **tidak pernah** terhubung langsung ke Supabase. Frontend tidak memuat URL Supabase, anon key, publishable key, maupun SDK Supabase (`@supabase/supabase-js` dilarang ada di `frontend/package.json`). |
| SUPA-02 | **Data API Supabase dinonaktifkan** di pengaturan proyek (Project Settings → Data API). HCS tidak memakai REST/GraphQL bawaan Supabase sama sekali. |
| SUPA-03 | Kunci service role dan connection string database hanya ada di environment variable backend Cloudways. Dilarang di kode, Git, log, atau frontend. Backend **tidak memakai** service role untuk query data harian (lihat SUPA-11). |
| SUPA-04 | Bucket Storage bersifat **privat**, dengan batas ukuran 5 MB dan jenis file PDF/JPG/PNG yang diatur di level bucket. Dokumen dibuka melalui backend setelah lolos FILE-04, memakai signed URL yang berlaku maksimal 5 menit. |
| SUPA-05 | Koneksi backend ke database wajib SSL ("Enforce SSL" aktif di Supabase). |
| SUPA-06 | Akun Supabase memakai email unit SDM dengan verifikasi dua langkah; anggota organisasi hanya PIC yang ditunjuk. |
| SUPA-07 | Tabel HCS disimpan di skema khusus **`hcs`**, bukan `public`, dan skema ini **tidak** dimasukkan ke daftar *Exposed schemas*. Skema `public` dibiarkan kosong. |
| SUPA-08 | **Setiap tabel** diaktifkan `ENABLE ROW LEVEL SECURITY` dan `FORCE ROW LEVEL SECURITY` di file migrasi yang sama dengan pembuatan tabelnya, **tanpa policy apa pun** (tolak semua). Dilarang membuat policy `USING (true)` atau policy untuk peran `anon`/`authenticated`. |
| SUPA-09 | Hak peran `anon` dan `authenticated` dicabut dari skema `hcs` dan `public`: `REVOKE ALL` pada tabel, sequence, dan function, termasuk *default privileges* untuk objek baru. |
| SUPA-10 | **Network Restrictions** Supabase aktif: database hanya menerima koneksi dari alamat IP server Cloudways (dan IP PIC saat pemeliharaan, dicabut setelah selesai). Jika Cloudways Velocity tidak memiliki IP keluar yang tetap, hal ini dicatat di LAPORAN_KEAMANAN dan dikompensasi dengan password database minimal 32 karakter acak yang dirotasi tiap 6 bulan. |
| SUPA-11 | Backend terhubung memakai peran database khusus **`hcs_app`** yang hanya boleh SELECT/INSERT/UPDATE pada tabel yang dibutuhkan. Tidak boleh DELETE pada tabel log, tidak boleh mengubah struktur tabel, dan bukan peran `postgres`. Peran ini *bypass RLS* hanya karena ia satu-satunya pihak yang dipercaya. Perubahan struktur dijalankan terpisah memakai peran migrasi. |
| SUPA-12 | Dilarang membuat **view** atau **function** `SECURITY DEFINER` di skema yang dapat diakses API. View wajib `security_invoker = true`. |
| SUPA-13 | **Supabase Auth tidak dipakai** (login diurus backend via Google). Pendaftaran pengguna Supabase Auth dimatikan. |
| SUPA-14 | **Security Advisor** dan **Performance Advisor** di dasbor Supabase wajib bersih dari temuan tingkat *Error* sebelum setiap deploy, dan diperiksa ulang setiap Senin. |
| SUPA-15 | Proyek Supabase **dipisah**: `hcs-dev` (data dummy, tanpa rekening asli) dan `hcs-prod` (data asli). Data asli **dilarang** disalin ke `hcs-dev`. |
| SUPA-16 | Semua perubahan struktur database **hanya melalui file migrasi** di folder `database/migrations/` yang ikut di-commit dan direview. Dilarang membuat atau mengubah tabel produksi lewat Table Editor atau SQL Editor dasbor. |

### 11.3 Aturan khusus untuk agen AI (vibe coding)

| Kode | Aturan |
|---|---|
| AI-01 | Agen AI (Claude Code atau sejenis) **tidak pernah** diberi akses ke `hcs-prod`: tidak ada connection string produksi, kunci service role produksi, maupun Supabase MCP yang tersambung ke produksi. Agen hanya boleh memakai `hcs-dev`. |
| AI-02 | Setiap file migrasi baru wajib memuat RLS (SUPA-08) dan REVOKE (SUPA-09). Pemeriksaan otomatis `npm run cek:rls` gagal jika ada tabel tanpa RLS, tabel di skema `public`, atau policy yang membuka akses. Pemeriksaan ini dijalankan di GitHub Actions sebelum deploy. |
| AI-03 | Agen tidak boleh menambahkan paket `@supabase/*` ke frontend, membuat endpoint tanpa middleware AKSES-01, atau menonaktifkan pemeriksaan keamanan untuk "mempercepat". Jika diminta, agen berhenti dan bertanya kepada pemilik proyek. |
| AI-04 | Setiap selesai satu tahap pembangunan, agen menjalankan tes keamanan otomatis (bagian 12) dan melaporkan hasilnya dalam bahasa sederhana sebelum lanjut ke tahap berikutnya. |
| AI-05 | Pemilik proyek menerima ringkasan "apa yang berubah di database" untuk setiap migrasi, dalam bahasa sederhana, sebelum migrasi dijalankan ke produksi. |

## 12. Pengujian Keamanan Wajib Sebelum Deploy

1. **Tes otomatis hak akses:** Karyawan A mencoba membuka, mengubah, dan mengunduh dokumen pengajuan Karyawan B → harus ditolak. Karyawan mencoba endpoint Admin → harus ditolak.
2. **Tes kebocoran data:** periksa respons API untuk peran Karyawan; tidak boleh ada kolom rekening, tarif, atau nominal (sebelum Selesai).
3. **Tes unggah:** file berekstensi `.pdf` yang isinya bukan PDF, dan file > 5 MB → harus ditolak.
4. **Tes sesi:** setelah 15 menit diam, permintaan berikutnya ditolak.
5. **`npm audit`** bersih dari temuan tinggi/kritis.
6. **Pemindaian otomatis** (mis. OWASP ZAP baseline) terhadap lingkungan uji, tanpa temuan tinggi.
7. **Tes kebocoran Supabase** (meniru cara peneliti UpGuard menemukan kebocoran):
   - Panggil `https://<proyek>.supabase.co/rest/v1/` dan `/graphql/v1` memakai anon key → harus **tidak tersedia** (Data API mati).
   - Cari URL Supabase, anon key, dan service role di seluruh file hasil build frontend (`.next/`) dan di riwayat Git → harus **tidak ditemukan**.
   - Jalankan `npm run cek:rls` di database produksi → semua tabel RLS aktif, tanpa policy terbuka, tanpa tabel di `public`.
   - Coba koneksi database dari jaringan selain server Cloudways → harus **ditolak** (SUPA-10).
   - Buka URL dokumen tanpa signed URL, dan signed URL yang sudah lewat 5 menit → harus **ditolak**.
   - Security Advisor Supabase → **0 temuan Error**.
8. **Checklist review:** seluruh kode aturan di dokumen ini ditandai terpenuhi.

Hasil pengujian dicatat di `docs/LAPORAN_KEAMANAN.md` untuk setiap rilis.
