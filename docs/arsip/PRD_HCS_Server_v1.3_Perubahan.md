# PRD HCS Versi Server — Lembar Perubahan v1.2 → v1.3

**Tanggal:** 29-09-2026
**Status dokumen:** Jalur cadangan.
**Ringkasan perubahan:** Menyamakan dengan PRD Versi Workspace v1.2. TAD diinput oleh karyawan di dalam pengajuannya, karyawan hanya mengisi data fakta, dan nominal yang disetujui dapat dilihat karyawan setelah Selesai.

---

## 1. Riwayat Versi (tambahkan baris)

| Versi | Tanggal | Perubahan | Status |
|---|---|---|---|
| 1.3 | 29-09-2026 | TAD diinput karyawan (bukan Admin); input manual TAD belum terdaftar; karyawan tidak melihat perhitungan; nominal disetujui terlihat setelah Selesai; tanggal kontrak TAD opsional | Menunggu persetujuan |

## 2. Aturan Bisnis yang Diubah

Aturan berikut **sama persis** dengan PRD Versi Workspace v1.2:

| Topik | Rujukan PRD Workspace v1.2 |
|---|---|
| TAD dimasukkan oleh karyawan di dalam pengajuannya | Bagian 5.2 dan 6.7 |
| Satu TAD hanya sekali per Nomor Surat Tugas | Bagian 6.4 |
| Perhitungan sebagai alat bantu Admin | Bagian 6.5 |
| Data yang diisi karyawan dan hal yang dapat dilihat karyawan | Bagian 6.8 |
| Data master TAD: kontrak opsional, status aktif mengikuti unggahan terbaru, TAD input manual | Bagian 7.3 |

**Dihapus dari v1.2:** fitur "Ajukan atas nama TAD" oleh Admin dan pengingat kontrak TAD.

## 3. Perubahan Skema Database

**Tabel `tad`:**
- `tgl_akhir_kontrak` menjadi opsional (boleh kosong).
- Tambah kolom `sumber_data` (unggahan / input_manual) dan `terverifikasi` (ya/tidak).

**Tabel baru `pengajuan_tad`** (rincian TAD dalam pengajuan karyawan):
id, pengajuan_id (induk), tad_id, no_surat_tugas, bank_snapshot, rekening_snapshot (terenkripsi), nominal_disetujui, status_rekening (lengkap / belum lengkap).
Aturan unik: kombinasi `no_surat_tugas + tad_id` hanya boleh muncul satu kali pada pengajuan yang aktif.

**Tabel `pengajuan`:**
- Kolom `jenis_subjek`, `subjek_id` (v1.2) dihapus, karena subjek pengajuan selalu karyawan. TAD dicatat di `pengajuan_tad`.
- Tambah `pernyataan_tad` (ya/tidak) dan `nominal_disetujui`.

**Keamanan API:** endpoint pencarian TAD untuk peran Karyawan hanya mengembalikan nama, NIK, vendor, dan unit. Nominal dan rincian perhitungan hanya dikirim ke Karyawan jika status pengajuan Selesai.

## 4. Dampak pada Build Plan Versi Server

| Chunk | Perubahan |
|---|---|
| 2 (Skema database) | Sesuaikan tabel `tad`, `pengajuan`, dan tambah `pengajuan_tad` |
| 4 (Klaim Perdin) | Bagian TAD dalam form karyawan menggantikan "Ajukan atas nama TAD" |
| 8 (Hitung SPPD) | Hasil perhitungan hanya tampil di sisi Admin; tampilan nominal ke karyawan setelah Selesai |
| 11 (Notifikasi) | Hapus pengingat kontrak TAD; tambah notifikasi Admin untuk TAD belum terdaftar atau rekening belum lengkap |
