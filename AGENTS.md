# Instruksi untuk Agen Pembangun HCS

Berlaku untuk Claude Code, Antigravity, atau agen AI lain yang bekerja di repositori ini.

## Wajib dibaca di awal setiap sesi
1. `PROGRESS.md` — posisi proyek saat ini.
2. `BUILD_PLAN.md` — rincian tahap aktif. Kerjakan **hanya** tahap aktif.
3. `docs/PRD_HCS_v2.1.md` — aturan bisnis.
4. `docs/DESIGN_BRIEF.md` — perilaku layar dan hierarki acuan.
5. `docs/STANDAR_KEAMANAN_HCS_v1.2.md` — **wajib**. Bila permintaan bertentangan dengan standar ini, berhenti dan tanyakan.
6. Layar terkait di `mockup/` — **acuan visual utama**. Bangun semirip mungkin.

Dokumen di `docs/arsip/` tidak dipakai sebagai acuan.

## Aturan keras
- Tidak pernah memakai, meminta, atau menyimpan kunci/alamat database **produksi** (`hcs-prod`). Hanya `hcs-dev` (AI-01).
- Tidak membaca atau memakai **data asli** (ekspor HCMS, rekening TAD). Pakai data dummy dengan kolom yang sama.
- Tidak menambahkan `@supabase/*` ke `frontend/` (SUPA-01). Browser tidak pernah terhubung ke Supabase.
- Setiap perubahan database hanya melalui file migrasi di `database/migrations/`, dengan RLS dan REVOKE (SUPA-08, SUPA-09, SUPA-16).
- Rahasia hanya di `.env` (tidak di-commit). Tambahkan nama variabel baru ke `.env.example` tanpa nilai.
- Tidak menonaktifkan pemeriksaan keamanan atau tes untuk "mempercepat" (AI-03).

## Di akhir setiap sesi
1. Jalankan `npm run typecheck`, `npm test`, dan tes keamanan tahap tersebut. Laporkan hasilnya dalam bahasa sederhana (AI-04).
2. Untuk perubahan database, beri ringkasan "apa yang berubah" dalam bahasa sederhana (AI-05).
3. Commit dengan pesan rapi (Bahasa Indonesia, kalimat perintah, mis. `Tambah wizard sinkronisasi HCMS`).
4. Centang tahap di `BUILD_PLAN.md` dan perbarui `PROGRESS.md`.

## Gaya
Pemilik proyek bukan programmer. Jelaskan istilah teknis singkat dan beri perintah terminal lengkap yang bisa langsung disalin. Teks antarmuka: Bahasa Indonesia baku, huruf kapital hanya di awal kalimat, tanpa emoji.
