# HCS — Human Capital System

Portal klaim dan perjalanan dinas PT Pegadaian Kantor Wilayah IV Balikpapan: Klaim Biaya Perdin, Klaim Biaya Perdin Diklat, Permohonan SPPD, dan Pemesanan Tiket Pesawat.

## Struktur folder

| Folder | Isi |
|---|---|
| `frontend/` | Tampilan (Next.js) |
| `backend/` | Server pengolah data (Express), satu-satunya yang mengakses database |
| `database/` | File migrasi struktur database |
| `docs/` | PRD, Design Brief, Standar Keamanan, laporan |
| `mockup/` | Desain Claude Design, acuan visual utama |

## Menjalankan di laptop

Perlu Node.js versi LTS (22 atau lebih baru) dan Git.

```bash
npm install          # memasang semua paket (sekali saja, atau saat ada paket baru)
npm run dev          # menjalankan tampilan dan server sekaligus
```

Buka http://localhost:3000. Tekan `Ctrl + C` di terminal untuk menghentikan.

Perintah lain:

```bash
npm test             # menjalankan tes otomatis
npm run typecheck    # memeriksa kesalahan penulisan kode
npm run build        # mencoba membangun versi produksi
```
