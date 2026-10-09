# PROGRESS — HCS (Human Capital System)

> File ini dibaca agen pembangun di awal setiap sesi. Simpan di root folder proyek HCS.

**Tahap aktif:** 3 – Bangun MVP · Build Plan Tahap 3 (Login Google, sesi, dan peran) berjalan: kode dan tes selesai, menunggu OAuth Client ID Google dan uji coba user
**Terakhir diperbarui:** 09-10-2026

## Dokumen acuan yang berlaku
| Dokumen | Versi | Status |
|---|---|---|
| `docs/PRD_HCS_v2.1.md` | 2.1 | ✅ Disetujui 08-10-2026 |
| `docs/DESIGN_BRIEF.md` | 1.1 | ✅ Disetujui 08-10-2026 |
| `mockup/HCS Mobile.dc.html`, `mockup/HCS Admin.dc.html` | 07-10-2026 | ✅ **Acuan visual utama** |
| `docs/STANDAR_KEAMANAN_HCS_v1.2.md` | 1.2 | ✅ Wajib (pengetatan Supabase) |
| `BUILD_PLAN.md` | 2.0 | ✅ Disetujui 08-10-2026 |

Dokumen lama ada di `docs/arsip/` dan **tidak** dipakai sebagai acuan.

## Status tahapan
| # | Tahap | Status | Catatan singkat |
|---|-------|--------|-----------------|
| 1 | PRD | ✅ Selesai | v2.1 disetujui 08-10-2026 |
| 2 | UI & UX Design Brief | ✅ Selesai | Brief v1.1 + mockup Claude Design disetujui 08-10-2026 |
| 3 | Bangun MVP | 🟡 Berjalan | Build Plan Tahap 1–2 dari 15 ✅; Tahap 3 🟡 (menunggu OAuth Google) |
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
| 08-10-2026 | Standar Keamanan v1.2: lima lapis kunci Supabase (Data API mati, skema `hcs`, RLS tolak semua, network restriction, peran `hcs_app`) + aturan agen AI | Kebocoran 16.326 database Supabase (UpGuard, Sep 2026) |

## Pertanyaan terbuka
0. Tanggal berlaku tarif SE 145 Tahun 2026: sementara 01-01-2026 (`database/migrations/0002_data_acuan.sql`). Konfirmasi sebelum migrasi dipasang.
1. Kolom isian rinci Pemesanan Tiket Pesawat (dibutuhkan saat tahap 8).
2. Validasi ulang template TAD final (EPS dan INHOUSE).
3. Pembayaran tahunan Cloudways dan Supabase lewat pengadaan; nama domain; region Singapura Cloudways Velocity; apakah IP keluar Cloudways tetap (SUPA-10).
4. File logo SVG dan web font Ronnia WOFF2 dari tim brand. Sementara memakai TTF di `mockup/_ds/`.

## Langkah berikutnya
Lanjutan Build Plan Tahap 3:
1. User membuat OAuth Client ID di Google Cloud memakai akun Gmail admin sistem (dipandu agen), isi `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` di `.env`.
2. ✅ Admin hcs-dev terdaftar: dicky.widyatama@pegadaian.co.id.
3. User mencoba: `npm run dev`, buka http://localhost:3000, masuk; coba Gmail pribadi (pesan domain); diam 15 menit (layar Sesi berakhir); Keluar.
4. Bila lolos: centang Tahap 3, push, cek GitHub Actions (job "database" kini juga menjalankan tes login).

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
