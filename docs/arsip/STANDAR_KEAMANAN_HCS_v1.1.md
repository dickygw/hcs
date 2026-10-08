# Standar Keamanan HCS

| | |
|---|---|
| **Versi** | 1.1 |
| **Tanggal** | 06-10-2026 |
| **Berlaku untuk** | Seluruh kode HCS (frontend, backend, database) |
| **Platform** | Cloudways Velocity (aplikasi) + Supabase (database dan dokumen) |
| **Sifat** | **Wajib.** Setiap aturan harus dipenuhi sebelum deploy ke produksi. |

> Instruksi untuk agen pembangun (Claude Code): baca dokumen ini sebelum menulis kode apa pun. Jika sebuah permintaan bertentangan dengan standar ini, berhenti dan tanyakan kepada pemilik proyek. Setiap aturan memiliki kode (mis. AUTH-01) agar dapat dirujuk saat review dan pengujian.

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
| AKSES-05 | Tarif, rumus, dan hasil perhitungan SPPD **tidak dikirim ke Karyawan** sebelum status Selesai. Setelah Selesai, hanya nominal yang disetujui. |
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

| Kode | Aturan |
|---|---|
| SUPA-01 | Browser **tidak pernah** terhubung langsung ke Supabase. Frontend tidak memuat URL Supabase, anon key, maupun SDK Supabase. |
| SUPA-02 | Data API publik Supabase dinonaktifkan, atau **Row Level Security aktif di setiap tabel tanpa satu pun policy yang membuka akses** (tolak semua). Tabel baru wajib mengikuti aturan ini. |
| SUPA-03 | Kunci service role dan connection string database hanya ada di environment variable backend Cloudways. Dilarang di kode, Git, log, atau frontend. |
| SUPA-04 | Bucket Storage bersifat **privat**. Dokumen dibuka melalui backend setelah lolos FILE-04, menggunakan signed URL yang berlaku maksimal 5 menit. |
| SUPA-05 | Koneksi backend ke database wajib SSL. |
| SUPA-06 | Akun Supabase memakai email unit SDM dengan verifikasi dua langkah; anggota organisasi hanya PIC yang ditunjuk. |

## 12. Pengujian Keamanan Wajib Sebelum Deploy

1. **Tes otomatis hak akses:** Karyawan A mencoba membuka, mengubah, dan mengunduh dokumen pengajuan Karyawan B → harus ditolak. Karyawan mencoba endpoint Admin → harus ditolak.
2. **Tes kebocoran data:** periksa respons API untuk peran Karyawan; tidak boleh ada kolom rekening, tarif, atau nominal (sebelum Selesai).
3. **Tes unggah:** file berekstensi `.pdf` yang isinya bukan PDF, dan file > 5 MB → harus ditolak.
4. **Tes sesi:** setelah 15 menit diam, permintaan berikutnya ditolak.
5. **`npm audit`** bersih dari temuan tinggi/kritis.
6. **Pemindaian otomatis** (mis. OWASP ZAP baseline) terhadap lingkungan uji, tanpa temuan tinggi.
7. **Tes Supabase:** coba akses tabel melalui Data API memakai anon key → harus ditolak atau tidak tersedia; buka URL dokumen tanpa signed URL → harus ditolak.
8. **Checklist review:** seluruh kode aturan di dokumen ini ditandai terpenuhi.

Hasil pengujian dicatat di `docs/LAPORAN_KEAMANAN.md` untuk setiap rilis.
