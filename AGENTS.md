# Instruksi untuk Agen Pembangun HCS

Berlaku untuk Claude Code, Antigravity, atau agen AI lain yang bekerja di repositori ini.

## Wajib dibaca di awal setiap sesi
1. `PROGRESS.md` — posisi proyek saat ini.
2. `BUILD_PLAN.md` — rincian tahap aktif. Kerjakan **hanya** tahap aktif.
3. `docs/PRD_HCS_v2.2.md` — aturan bisnis dan arsitektur (Google Apps Script).
4. `docs/DESIGN_BRIEF.md` — perilaku layar dan hierarki acuan.
5. `docs/STANDAR_KEAMANAN_HCS_v1.3.md` — **wajib**. Bila permintaan bertentangan dengan standar ini, berhenti dan tanyakan.
6. Layar terkait di `mockup/` — **acuan visual utama**. Bangun semirip mungkin (kecuali layar U1, lihat PRD 7.3).

Dokumen di `docs/arsip/` dan kode di cabang `arsip/jalur-server` tidak dipakai sebagai acuan.

## Aturan keras
- Hanya bekerja di proyek **HCS-dev**. Tidak pernah memakai, meminta, atau menyimpan ID skrip, spreadsheet, atau folder **HCS-prod**, dan tidak pernah `clasp push`/`deploy` ke prod (AI-01).
- Tidak membaca atau memakai **data asli** (ekspor HCMS, rekening TAD). Pakai data dummy dengan kolom yang sama.
- Setiap fungsi yang dapat dipanggil browser lewat pembungkus pemeriksa AKSES-01; fungsi internal berakhiran `_`.
- Tidak membagikan file (`setSharing`, editor, tautan), tidak melonggarkan deployment (`access` selain `DOMAIN`), tidak membuat `doPost` (FILE-05, WS-01, WEB-03).
- Perubahan struktur sheet hanya lewat fungsi migrasi bernomor di kode (WS-13).
- Rahasia hanya di Script Properties atau `.env` (tidak di-commit). Tambahkan nama variabel baru ke `.env.example` tanpa nilai.
- Tidak menonaktifkan pemeriksaan keamanan atau tes untuk "mempercepat" (AI-03).

## Di akhir setiap sesi
1. Jalankan `npm run typecheck`, `npm test`, `npm run cek:keamanan`, dan tes keamanan tahap tersebut. Laporkan hasilnya dalam bahasa sederhana (AI-04).
2. Untuk perubahan struktur data, beri ringkasan "apa yang berubah" dalam bahasa sederhana (AI-05).
3. Commit dengan pesan rapi (Bahasa Indonesia, kalimat perintah, mis. `Tambah wizard sinkronisasi HCMS`).
4. Centang tahap di `BUILD_PLAN.md` dan perbarui `PROGRESS.md`.

## Gaya
Pemilik proyek bukan programmer. Jelaskan istilah teknis singkat dan beri perintah terminal lengkap yang bisa langsung disalin. Teks antarmuka: Bahasa Indonesia baku, huruf kapital hanya di awal kalimat, tanpa emoji.
