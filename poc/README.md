# HCS-POC — Uji kecepatan (Build Plan Tahap 0)

**Kode buangan.** Dipakai hanya untuk mengukur kecepatan Apps Script + Sheets, lalu dihapus setelah uji lulus. Hanya data dummy.

## Isi
- `src/Code.js` — fungsi server (`api` satu-satunya pintu dari browser; fungsi lain berakhiran `_`).
- `src/Siapkan.js` — `siapkanPoc`, `isiDataDummy`, `cekBerbagi` (hanya pemilik).
- `src/Index.html` — 4 layar uji: Pengajuan saya, Ajukan klaim, Tugasku, Hasil uji.
- `src/appsscript.json` — Execute as akun pemilik, akses hanya pegadaian.co.id.

## Data dummy
873 karyawan, 1.346 TAD, 10.000 pengajuan (3 tahun), ±3.000 rincian TAD, ±29.000 riwayat status.

## Aksi yang diukur
Lihat tabel target di layar **Hasil uji** (PRD v2.2 bagian 9.1). Lulus bila p75 setiap aksi memenuhi target dan simulasi 20 pengguna bersamaan tanpa error.
