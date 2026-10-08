# PROGRESS — HCS (Human Capital System)

> File ini dibaca agen pembangun di awal setiap sesi. Simpan di root folder proyek HCS.

**Tahap aktif:** 3 – Bangun MVP · Build Plan Tahap 2 (Database aman dan bucket privat) berjalan: kode selesai, menunggu pengaturan dasbor Supabase hcs-dev
**Terakhir diperbarui:** 08-10-2026

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
| 3 | Bangun MVP | 🟡 Berjalan | Build Plan Tahap 1 dari 15 ✅; Tahap 2 🟡 (kode selesai, belum dipasang ke hcs-dev) |
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
| 08-10-2026 | Standar Keamanan v1.2: lima lapis kunci Supabase (Data API mati, skema `hcs`, RLS tolak semua, network restriction, peran `hcs_app`) + aturan agen AI | Kebocoran 16.326 database Supabase (UpGuard, Sep 2026) |

## Pertanyaan terbuka
0. Tanggal berlaku tarif SE 145 Tahun 2026: sementara 01-01-2026 (`database/migrations/0002_data_acuan.sql`). Konfirmasi sebelum migrasi dipasang.
1. Kolom isian rinci Pemesanan Tiket Pesawat (dibutuhkan saat tahap 8).
2. Validasi ulang template TAD final (EPS dan INHOUSE).
3. Pembayaran tahunan Cloudways dan Supabase lewat pengadaan; nama domain; region Singapura Cloudways Velocity; apakah IP keluar Cloudways tetap (SUPA-10).
4. File logo SVG dan web font Ronnia WOFF2 dari tim brand. Sementara memakai TTF di `mockup/_ds/`.

## Langkah berikutnya
Lanjutan Build Plan Tahap 2 (sesi berikutnya):
1. User di dasbor Supabase `hcs-dev`:
   1. ✅ Sertifikat SSL sudah ada di `database/prod-ca-2021.crt`. Di `.env`, ubah `DATABASE_CA_FILE` menjadi `../database/prod-ca-2021.crt`.
   2. Lengkapi `.env` (sudah dibuat; password `hcs_app` dan `ENCRYPTION_KEY` sudah terisi): ganti `[REF]`, `[HOST]` (Connect → Session pooler), `[PASSWORD-POSTGRES]`.
   3. Matikan Data API; aktifkan Enforce SSL; matikan signup Supabase Auth.
   4. Buat bucket privat `dokumen` (5 MB; PDF/JPG/PNG).
   5. Buat S3 access key, isi baris `SUPABASE_S3_...` di `.env`.
2. Agen: `npm run db:migrasi`, `npm run db:seed`, `npm run cek:rls` ke hcs-dev; uji `/rest/v1/` tidak tersedia; user cek Security Advisor (0 Error).
3. Commit akhir, centang Tahap 2 di `BUILD_PLAN.md`, user push (`git -C D:/HCS push`) dan cek job "database" di GitHub Actions hijau.

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
