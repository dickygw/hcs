# PROGRESS — HCS (Human Capital System)

> File ini dibaca agen pembangun di awal setiap sesi. Simpan di root folder proyek HCS.

**Tahap aktif:** 3 – Bangun MVP · Build Plan v3.0 Tahap 0–5 ✅; **Tahap 6** (Klaim Biaya Perdin Diklat) kode selesai, menunggu uji user di HCS-dev
**Terakhir diperbarui:** 13-10-2026

## Dokumen acuan yang berlaku
| Dokumen | Versi | Status |
|---|---|---|
| `docs/PRD_HCS_v2.2.md` | 2.2 | ✅ Disetujui 09-10-2026 (jalur Apps Script) |
| `docs/DESIGN_BRIEF.md` | 1.1 | ✅ Disetujui 08-10-2026 |
| `mockup/HCS Mobile.dc.html`, `mockup/HCS Admin.dc.html` | 07-10-2026 | ✅ **Acuan visual utama** |
| `docs/STANDAR_KEAMANAN_HCS_v1.3.md` | 1.3 | ✅ Disetujui 09-10-2026 (wajib, jalur Apps Script) |
| `BUILD_PLAN.md` | 3.0 | 🟡 Draf, menunggu persetujuan (jalur Apps Script) |

Dokumen lama ada di `docs/arsip/` dan **tidak** dipakai sebagai acuan.

## Status tahapan
| # | Tahap | Status | Catatan singkat |
|---|-------|--------|-----------------|
| 1 | PRD | ✅ Selesai | v2.1 disetujui 08-10-2026 |
| 2 | UI & UX Design Brief | ✅ Selesai | Brief v1.1 + mockup Claude Design disetujui 08-10-2026 |
| 3 | Bangun MVP | 🟡 Berjalan | Build Plan Tahap 0–5 dari 15 ✅; Tahap 6 🟡 |
| 4 | Celah Keamanan | 🔒 Terkunci | Tes keamanan juga dijalankan setiap akhir tahap (AI-04) |
| 5 | Debug Error ⚙️ | 🔒 Terkunci | |
| 6 | E2E Test (Playwright) | 🔒 Terkunci | |
| 7 | Refactor & Dead Code | 🔒 Terkunci | |
| 8 | Git Commit Rapi ⚙️ | 🔒 Terkunci | |
| 9 | Task → Skill | 🔒 Terkunci | |

Legenda: ⚙️ Alat bantu, boleh dipakai sejak Tahap 3 · 🔒 Terkunci · 🟡 Berjalan · ✅ Selesai · 🔁 Perlu diperbarui

## Keputusan penting
| Tanggal | Keputusan | Alasan |
|---------|-----------|--------|
| 25-09-2026 | HCS dibangun dari nol, terpisah dari HCSS | Arahan user |
| 25-09-2026 | Nomor Surat Tugas / Surat Pemanggilan menjadi kunci penghubung dan pencegah double bayar | Nomor SPPD kurang tepat |
| 29-09-2026 | TAD diinput karyawan di dalam pengajuannya sendiri; karyawan tidak melihat tarif/hitungan | Kurangi beban Admin; transparansi setelah Selesai |
| 06-10-2026 | Jalur Google Workspace dihentikan; aplikasi di Cloudways Velocity, database dan dokumen di Supabase | Kanwil tidak punya tim IT; tidak ingin mengelola server |
| 08-10-2026 | PRD v2.1 dan Design Brief v1.1 disetujui; **mockup Claude Design menjadi acuan visual utama** | Arahan user |
| 08-10-2026 | Versi paket dikunci: Next.js 16.4, React 19.3, Express 5.2, TypeScript 5.9, Vitest 5.0; `shell-quote` dipaksa ke 1.12.0 | `npm audit` menemukan celah kritis di vitest 3 dan concurrently |
| 08-10-2026 | Pembangunan dilanjutkan di **Claude Code** di laptop user (folder D:\HCS), bukan Antigravity | Arahan user; Claude Code bisa menjalankan perintah langsung di laptop |
| 09-10-2026 | Login memakai alur pengalihan OAuth (authorization code) di backend, bukan tombol bawaan Google | Tombol bisa persis mockup ("Gunakan Email Corporate"); client secret tetap di server |
| 09-10-2026 | Paket baru: `google-auth-library` (verifikasi token Google resmi), `zod` (validasi input, INPUT-01) | DEP-04 |
| 09-10-2026 | Sesi tidak dihapus dari database; keluar/kedaluwarsa ditandai `dicabut_pada` | hcs_app tidak boleh DELETE (cek:rls) |
| 09-10-2026 | Login tetap Google (Pilihan 1); OAuth client dibuat dengan akun Gmail admin sistem karena akun kantor tidak diberi akses Google Cloud. Cadangan bila Pegadaian memblokir aplikasi pihak ketiga: kode sekali pakai lewat email (perlu ubah AUTH-01) | Arahan user |
| 09-10-2026 | Admin masuk dengan email kantor pribadi (sementara: dicky.widyatama@pegadaian.co.id). `manohc.balikpapan@pegadaian.co.id` hanya kontak Admin SDM di U2, bukan akun login | Jejak tindakan per orang (PRD 10.3) |
| 09-10-2026 | **IT Security pusat menolak**: aplikasi dan data tidak boleh keluar dari lingkungan Workspace/Google Pegadaian. Pilihan resmi: lewat vendor, atau dikembangkan di Kanwil memakai Google Apps Script | Surat ke pusat, dijawab IT Security |
| 09-10-2026 | Uji kecepatan lulus dengan catatan: rancangan **sheet aktif kecil + arsip per tahun**, cache hanya sheet aktif dan master, kunci hanya untuk penghitung nomor dan cek unik, detail dimuat bersama daftar (batas bawah ±0,9 dtk per panggilan Google). HP 4G belum diuji → Tahap 13/pilot | `docs/HASIL_UJI_KECEPATAN.md`; arahan user untuk lanjut |
| 09-10-2026 | Standar Keamanan v1.3 disetujui: lima lapis kunci Workspace (WS-01 s.d. WS-14), cache browser hanya di memori (WEB-06); teknik kecepatan Apps Script dirinci di PRD 9.1 | Arahan user |
| 09-10-2026 | PRD v2.2 disetujui: jalur Google Apps Script, target kecepatan dilonggarkan (buka ≤ 4 dtk, filter ≤ 3 dtk, 20 pengguna bersamaan), pemegang akun unit: dicky.widyatama | Arahan user |
| 13-10-2026 | File HCMS dan TAD dibaca **di browser Admin**; hanya kolom yang dipakai dikirim ke server, server memvalidasi ulang dan hanya menyimpan 12 kolom | Kolom sensitif (NIK KTP, NPWP, rekening karyawan) tidak pernah keluar dari laptop; lebih ketat dari DATA-05, tanpa pustaka Excel tambahan |
| 13-10-2026 | Unggahan HCMS dengan baris bermasalah ditolak seluruhnya; unggahan TAD melewati baris bermasalah (TAD yang NIK-nya ada di baris bermasalah dan TAD input manual tidak dinonaktifkan). NIK TAD wajib 16 digit | Mencegah karyawan nonaktif karena salah ketik; TAD tetap bisa diimpor sebagian |
| 13-10-2026 | Nomor pengajuan (KP-0001) dibuat saat draf pertama disimpan; penghitung per awalan di Script Properties di dalam kunci. Draf tersimpan di server setiap pindah langkah, tidak di browser | Dokumen dapat diunggah sejak langkah 1; WEB-06 |
| 13-10-2026 | TAD belum terdaftar langsung masuk data master sebagai "input manual, belum terverifikasi" saat draf disimpan; NIK yang sudah ada dipakai ulang. NIK TAD di layar karyawan tersamar (6472xxxx0912) | PRD 5.7; mockup K3 langkah 4 |
| 13-10-2026 | Dokumen wajib: Surat Tugas dan formulir; kuitansi hotel bila menginap; kuitansi transportasi bila tanpa kendaraan dinas | PRD 5.3 diterjemahkan ke isian form |
| 13-10-2026 | Klaim Perdin Diklat memakai mesin form yang sama lewat konfigurasi per jenis layanan (`KONFIG_LAYANAN`); Nomor Surat Pemanggilan disimpan di kolom `no_surat_tugas`, dokumen di jenis `surat_tugas` dengan label Surat Pemanggilan | Tanpa duplikasi kode dan tanpa ubah struktur sheet |
| 08-10-2026 | Standar Keamanan v1.2: lima lapis kunci Supabase (Data API mati, skema `hcs`, RLS tolak semua, network restriction, peran `hcs_app`) + aturan agen AI | Kebocoran 16.326 database Supabase (UpGuard, Sep 2026) |

## Pertanyaan terbuka
0. Tanggal berlaku tarif SE 145 Tahun 2026: sementara 01-01-2026 (`database/migrations/0002_data_acuan.sql`). Konfirmasi sebelum migrasi dipasang.
1. Kolom isian rinci Pemesanan Tiket Pesawat (dibutuhkan saat tahap 8).
2. Validasi ulang template TAD final (EPS dan INHOUSE). Kolom sementara: NIK, NAMA, NAMA BANK, NOMOR REKENING, VENDOR, UNIT KERJA, TANGGAL AKHIR KONTRAK; NIK TAD dianggap NIK KTP 16 digit.
5. Judul kolom ekspor HCMS asli: dummy memakai 12 judul PRD + 81 kolom rekaan. Pastikan 12 judul sama persis dengan file asli (dicocokkan tanpa beda huruf besar/kecil dan garis bawah).
3. Pembayaran tahunan Cloudways dan Supabase lewat pengadaan; nama domain; region Singapura Cloudways Velocity; apakah IP keluar Cloudways tetap (SUPA-10).
4. File logo SVG dan web font Ronnia WOFF2 dari tim brand. Sementara memakai TTF di `mockup/_ds/`.

## Langkah berikutnya
Uji Tahap 6 di HCS-dev (user):
1. Kirim kode: `npm run kirim:dev`, lalu perbarui deployment (perintah di bawah).
2. Dari HP dengan akun manohc.balikpapan: + Ajukan → Klaim Perdin Diklat → isi 6 langkah → Kirim → nomor KD-0001; label "Surat Pemanggilan" di form, tinjau, layar sukses, dan detail.
3. Bila lolos: centang Tahap 6, lalu Tahap 7.

Utang uji manual Tahap 3 (dibawa ke Tahap 13): diam 15 menit → U3 "Sesi Anda berakhir" → Masuk kembali; klik Keluar → layar "Anda sudah keluar dari HCS".

Info lingkungan HCS-dev:
- Editor: https://script.google.com/d/1DvFXJzHuJPjCRTSOaRK6hEsBHcuXG-uog_rzqpu4XTAgrMRB1TQeyLIJ/edit (akun unit manohc.balikpapan)
- Web app: https://script.google.com/a/macros/pegadaian.co.id/s/AKfycbyElbpFuUj1RF9ewfuVG6VoB8a03vGddcsjfTL74jsIpxn6bU8jh8D_kfWaTv9fkgkj/exec
- Kirim kode: `npm run kirim:dev`, lalu perbarui deployment: `cd apps-script && npx --yes @google/clasp@3.4.1 update-deployment AKfycbyElbpFuUj1RF9ewfuVG6VoB8a03vGddcsjfTL74jsIpxn6bU8jh8D_kfWaTv9fkgkj`
- Proyek HCS-POC (uji kecepatan) boleh dihapus user; kodenya ada di riwayat Git.

## Log sesi
| Tanggal | Tahap | Yang dikerjakan |
|---------|-------|-----------------|
| 25-09-2026 | 1 | Ronde 1–4 PRD, draft v0.1 |
| 26-09 s.d. 07-10-2026 | 1–2 | PRD v1.0 → v2.1, Design Brief v1.0 → v1.1, Standar Keamanan v1.0 → v1.1, mockup Claude Design |
| 08-10-2026 | 1–2 → 3 | PRD v2.1 dan Design Brief v1.1 disetujui; mockup jadi acuan visual; Standar Keamanan v1.2 (pengetatan Supabase); mockup diekstrak ke `mockup/` |
| 08-10-2026 | 3 | Build Plan v2.0 disusun (15 tahap, prompt agen dan tes keamanan per tahap) |
| 08-10-2026 | 3 | Build Plan disetujui. Tahap 1: kerangka monorepo (Next.js 16, Express 5, TypeScript), token Pegadaian DS + Ronnia, AGENTS.md, CI (typecheck, tes, build, npm audit, gitleaks), Dependabot; dokumen dipindah ke docs/. Lolos uji: 5 tes, build, audit 0 celah |
| 08-10-2026 | 3 | Build Plan Tahap 1 selesai: Node 22.14 dan Git 2.55 terpasang; typecheck, 5 tes, audit 0 celah, build lolos; lencana "Server terhubung" hijau; commit pertama `c6aa401` di repo privat github.com/dickygw/hcs; secret scanning, Dependabot, dan Actions hijau |
| 08-10-2026 | 3 | Build Plan Tahap 2 (sebagian): migrasi 0001 (skema hcs, 14 tabel, RLS tolak semua, REVOKE, peran hcs_app) dan 0002 (jenis layanan, tarif SPPD); skema Drizzle; enkripsi AES-256-GCM + 7 tes; seed dummy 30 karyawan + 15 TAD; `cek:rls` + job CI database. Diuji di Postgres lokal: migrasi, seed, cek:rls lolos; 6 kerusakan sengaja tertangkap. Belum dipasang ke hcs-dev |
| 09-10-2026 | 3 | Build Plan Tahap 2 selesai: `.env` hcs-dev lengkap (DB, SSL, S3); migrasi 0001–0002 terpasang di hcs-dev; seed 30 karyawan + 15 TAD; `cek:rls` 8/8 lolos; hcs_app terverifikasi tidak bisa hapus log dan tidak bisa ubah struktur; 13 rekening tersimpan terenkripsi (0 angka polos); typecheck dan 12 tes lolos |
| 09-10-2026 | 3 | Build Plan Tahap 3 (kode): migrasi 0003 tabel sesi (terpasang di hcs-dev); login Google lewat backend (tanda tangan, audience, kedaluwarsa, hd, email terverifikasi, state); sesi cookie HttpOnly/Secure/SameSite=Lax, diam 15 menit, maks 12 jam, keluar mencabut sesi; satu pemeriksa peran tolak-bawaan; CSRF; rate limit per IP dan per email; layar U1, U1 error, U2, U3, kerangka navigasi karyawan (K1 kosong, K5 kosong, K6 Profil) dan Admin. 33 tes lolos (14 tes keamanan login), cek:rls lolos, audit 0 celah, build lolos |
| 09-10-2026 | 3 | Login Google berhasil di hcs-dev (Admin dicky.widyatama), logo dan peringatan hydration diperbaiki. IT Security pusat menolak aplikasi di luar Workspace Pegadaian → pembangunan dihentikan sementara, menunggu keputusan jalur |
| 09-10-2026 | 3 | PRD v2.2, Standar Keamanan v1.3, Build Plan v3.0 (jalur Apps Script) disetujui. Tahap 0: aplikasi uji kecepatan (poc/) dibuat, data dummy 3 tahun diisi, ter-deploy di HCS-POC akun unit. clasp dijalankan lewat npx versi terkunci (celah braces di clasp, tidak masuk daftar paket) |
| 09-10-2026 | 3 | Tahap 0 selesai: 5 versi aplikasi uji; v5 (sheet aktif + arsip per tahun) lulus di laptop, semua aksi baca ±1 dtk, 20 kiriman bersamaan tanpa error. Catatan: antrean tulis dan uji HP 4G dibawa ke Tahap 2 dan 13 |
| 09-10-2026 | 3 | Tahap 1 (kode): repo dirapikan ke apps-script/ + tampilan/ + alat/; pembungkus pemeriksa AKSES-01 (satu pintu `api`, rute terdaftar, tolak bawaan); build esbuild + Vite → Code.js 3 KB, Index.html 1,15 MB; cek:keamanan + CI; proyek HCS-dev dibuat dan ter-deploy. 23 tes lolos, audit 0 celah (vite-plugin-singlefile dan clasp tidak dipasang karena celah braces) |
| 09-10-2026 | 3 | Tahap 1 selesai: halaman HCS-dev tampil dengan Ronnia dan "Server terhubung" (diuji user). Temuan: HtmlService merusak pola `<huruf` di dalam skrip → JS tampilan dikirim base64 dan diperiksa saat build |
| 09-10-2026 | 3 | Tahap 2 selesai: skema 15 tabel (3 spreadsheet), modul data (baca sekaligus, cache tabel kecil, netralisasi rumus), enkripsi AES-256-GCM (@noble/ciphers, berjalan tanpa fitur browser), migrasi bernomor, fungsi pemilik (migrasi, kunci, dummy, cekBerbagi, trigger). User menjalankan kelima fungsi di HCS-dev tanpa error. 48 tes lolos, cek:keamanan lolos, audit 0 celah |
| 09-10-2026 | 3 | Tahap 3 (kode): sesi HCS di CacheService (15 menit diam, maks 12 jam, keluar menghapus sesi), pembatas 120 panggilan/menit per email, peran dari tabel pengguna + data master karyawan, rute mulai/keluar, layar U2, U3, sudah keluar, kerangka karyawan (K1 kosong, K5 kosong, K6) dan Admin, fungsi tambahAdmin. Gambar halftone diperkecil 584 → 18 KB. 60 tes lolos |
| 09-10-2026 | 3 | Uji Tahap 3: U2 tampil untuk manohc (tidak terdaftar); setelah tambahAdmin, dicky masuk ke kerangka Admin. Sisa uji: kunci layar 15 menit dan Keluar. Sesi dihentikan atas arahan user |
| 13-10-2026 | 3 | Tahap 3 ditutup atas arahan user (tidak ada waktu uji 15 menit). Uji manual U3 dan Keluar ditunda ke Tahap 13; perilakunya sudah dicakup tes otomatis |
| 13-10-2026 | 3 | Tahap 4 (kode): pembaca/penulis .xlsx tanpa pustaka (browser), wizard 4 langkah Sinkronisasi HCMS dan Unggah TAD, A5 dan A6 per halaman 20 baris, koreksi JG beralasan + log, indikator umur data, riwayat unggahan, template TAD kosong, file dummy di `contoh-dummy/` (`npm run buat:dummy`). 81 tes lolos (21 tes baru), simulasi tampilan lolos |
| 13-10-2026 | 3 | Tahap 4 selesai: user menguji di HCS-dev tanpa error (kolom salah terdeteksi, sinkronisasi 897 baris diterapkan, koreksi JG, unggah TAD dengan 4 baris bermasalah, rekening tersamar, isian `=1+1` tersimpan sebagai teks) |
| 13-10-2026 | 3 | Tahap 5 (kode): K1 daftar + filter, K2, K3 enam langkah (validasi saat kolom ditinggalkan, draf di server, unggah dengan cek isi file, foto diperkecil di perangkat, bagian TAD dengan saran tanpa rekening dan TAD belum terdaftar), K3 sukses, K4 detail (revisi, ditolak, diproses, nominal setelah Selesai), dialog batalkan, edit dan kirim ulang. 102 tes lolos (21 tes baru: kepemilikan A vs B, rekening tidak bocor, file palsu, > 5 MB, TAD sekali per Surat Tugas); simulasi alur karyawan lolos |
| 13-10-2026 | 3 | Tahap 5 selesai: user menguji di HCS-dev tanpa error (pengajuan dengan TAD terkirim dari HP, file > 5 MB ditolak, unduh dokumen, batalkan, cekBerbagi aman) |
| 13-10-2026 | 3 | Tahap 6 (kode): Klaim Perdin Diklat aktif di K2, nomor KD-xxxx, label Surat Pemanggilan di semua layar dan pesan server. 107 tes lolos (5 tes baru: nomor KD, label, kepemilikan dan unggah diulang); simulasi alur Diklat lolos |
