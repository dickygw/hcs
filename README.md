# HCS — Human Capital System

Portal klaim dan perjalanan dinas PT Pegadaian Kantor Wilayah IV Balikpapan: Klaim Biaya Perdin, Klaim Biaya Perdin Diklat, Permohonan SPPD, dan Pemesanan Tiket Pesawat.

Berjalan di **Google Workspace Pegadaian** (Apps Script, Sheets, Drive) sesuai PRD v2.2.

## Struktur folder

| Folder | Isi |
|---|---|
| `apps-script/` | Kode server (TypeScript) + `appsscript.json`; hasil build di `apps-script/dist/` |
| `tampilan/` | Tampilan HP dan Admin (React), dibundel menjadi satu `Index.html` |
| `alat/` | Skrip build dan pemeriksa keamanan |
| `docs/` | PRD, Design Brief, Standar Keamanan, laporan |
| `mockup/` | Desain Claude Design, acuan visual utama |

Kode jalur lama (Next.js, Express, Supabase) ada di cabang `arsip/jalur-server`.

## Perintah

Perlu Node.js 22 atau lebih baru dan Git.

```bash
npm install            # memasang paket (sekali saja, atau saat ada paket baru)
npm run typecheck      # memeriksa kesalahan penulisan kode
npm test               # tes otomatis
npm run build          # membuat apps-script/dist (Code.js, Index.html, appsscript.json)
npm run cek:keamanan   # pemeriksaan aturan keamanan (wajib lolos)
npm run kirim:dev      # build + cek + kirim ke proyek HCS-dev (clasp)
```

`clasp` dijalankan lewat `npx @google/clasp@3.4.1` (tidak dipasang sebagai paket karena celah pada dependensinya; hanya dipakai di laptop). Rilis ke HCS-prod dilakukan pemegang akun unit (Standar Keamanan AI-01).
