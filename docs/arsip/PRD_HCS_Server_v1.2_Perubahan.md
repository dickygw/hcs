# PRD HCS Versi Server — Lembar Perubahan v1.1 → v1.2

**Tanggal:** 29-09-2026
**Status dokumen:** Jalur cadangan. Diaktifkan jika pemicu migrasi pada PRD Versi Workspace (Bagian 13) terpenuhi.
**Ringkasan perubahan:** Aturan data master, golongan, penguncian data per pengajuan, dan penanganan TAD disamakan dengan PRD Versi Workspace v1.1.

---

## 1. Riwayat Versi (tambahkan baris)

| Versi | Tanggal | Perubahan | Status |
|---|---|---|---|
| 1.2 | 29-09-2026 | Ditetapkan sebagai jalur cadangan; data master karyawan dari HCMS dan sinkronisasi wajib; golongan mengikuti JG jabatan yang sedang dijalankan; penguncian data per pengajuan; data master TAD, pengajuan atas nama TAD, dan perlindungan rekening | Menunggu persetujuan |

## 2. Status Dokumen (bagian baru, letakkan di awal PRD)

PRD ini adalah **Jalur B (cadangan)**. Pembangunan saat ini menggunakan PRD Versi Workspace. Struktur data kedua jalur dibuat identik agar migrasi cukup berupa pemindahan data.

## 3. Aturan Bisnis yang Ditambahkan

Aturan berikut **sama persis** dengan PRD Versi Workspace v1.1 dan disalin ke PRD ini:

| Topik | Rujukan PRD Workspace v1.1 |
|---|---|
| TAD sebagai subjek pengajuan (tidak login) | Bagian 5.2 |
| Golongan mengikuti JG jabatan yang sedang dijalankan; koreksi JG manual oleh Admin | Bagian 6.5 |
| Tarif TAD 70% Golongan C | Bagian 6.5 |
| Penguncian data per pengajuan | Bagian 6.6 |
| Pengajuan atas nama TAD dengan saran nama | Bagian 6.7 |
| Data master karyawan (12 kolom dari HCMS) | Bagian 7.1 |
| Sinkronisasi wajib dan pengingat | Bagian 7.2 |
| Data master TAD | Bagian 7.3 |
| Perlindungan data rekening TAD | Bagian 7.4 |
| Notifikasi pengingat sinkronisasi dan kontrak TAD | Bagian 9 |

## 4. Perubahan Skema Database

**Tabel baru:**

| Tabel | Kolom utama |
|---|---|
| `karyawan` | nik_pendek (PK), nama, email (unik), jenis_karyawan, jg_saat_ini, jg_definitif, jg_perdin_override, tipe_posisi, nama_jabatan, kode_unit, nama_unit, cabang, kantor_area, aktif, diperbarui_pada |
| `tad` | id (PK), nik, nama, nama_bank, no_rekening (terenkripsi), vendor, unit_kerja, tgl_akhir_kontrak, aktif |
| `riwayat_sinkronisasi` | id, jenis (HCMS/TAD), diunggah_oleh, waktu, nama_file, jml_baru, jml_nonaktif, jml_berubah |
| `log_akses_rekening` | id, admin, waktu, pengajuan_id, jenis_akses (cetak/ekspor) |
| `log_kinerja` | id, aksi, durasi_ms, waktu |

**Tabel `pengajuan` ditambah kolom salinan (terkunci saat dikirim):**
jenis_subjek (karyawan/TAD), subjek_id, jg_snapshot, golongan_snapshot, jabatan_snapshot, unit_snapshot, bank_snapshot, rekening_snapshot (terenkripsi), diajukan_oleh.

**Catatan keamanan khusus Jalur B:** kolom nomor rekening dienkripsi di database, dan kuncinya disimpan di Secret Manager.

## 5. Dampak pada Build Plan Versi Server

| Chunk | Perubahan |
|---|---|
| 2 (Skema database) | Tambah tabel dan kolom pada Bagian 4 |
| Baru, setelah chunk 2 | Sinkronisasi HCMS, unggah data TAD, pengingat pembaruan |
| 4 (Klaim Perdin) | Tambah pengajuan atas nama TAD |
| 8 (Hitung SPPD) | Tambah aturan JG saat ini, koreksi manual, tarif TAD, penguncian data |
| 10 (Halaman Admin) | Tambah log akses rekening |
| 11 (Notifikasi) | Tambah pengingat sinkronisasi dan kontrak TAD |
