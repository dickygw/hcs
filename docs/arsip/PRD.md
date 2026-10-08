# PRD — HCS (Human Capital System)
Versi: 0.1 (draft, Ronde 1–4) · Tanggal: 25-09-2026 · Penyusun: Dicky

## 1. Ringkasan
HCS adalah satu pintu pengajuan layanan perjalanan dinas bagi karyawan: Permohonan SPPD, Pemesanan Tiket Pesawat, Klaim Biaya Perjalanan Dinas, dan Klaim Biaya Perjalanan Dinas Diklat. Karyawan cukup memilih layanan, mengisi form, dan melacak statusnya. Admin SDM memproses semuanya dari satu tempat.

## 2. Latar belakang & masalah
Saat ini pengajuan masuk lewat 4 kanal: form kertas, email, WhatsApp, dan aplikasi E-Office.

**Sisi Karyawan**
- Bingung cara mengajukan klaim yang menjadi haknya (Perdin, Perdin Diklat, tiket pesawat, SPPD).
- Banyak form manual yang harus dicari sendiri.
- Tidak bisa melacak apakah pengajuan sudah diproses Admin.

**Sisi Admin SDM**
- Harus mengecek banyak sumber setiap pagi (target zero email, zero surat E-Office, cek WA).
- Sering terjadi double pembayaran karena karyawan mengirim pengajuan yang sama lewat email dan WA.
- Sulit melacak progres pengajuan yang sedang dikerjakan.
- Berkas cetak mudah hilang dan tidak tersimpan rapi.

## 3. Tujuan & di luar cakupan
**Tujuan:** menyatukan semua pengajuan perjalanan dinas dalam satu sistem yang bisa dilacak, mencegah double bayar, dan menyimpan berkas secara digital.

**Di luar cakupan:**
- Proses transfer pembayaran
- Pengelolaan anggaran
- Approval berjenjang atasan
- Klaim non-perjalanan (kacamata, pengobatan, dll)

## 4. Pengguna & peran
Perangkat: HP dan laptop (tampilan responsif).

| Aksi | Karyawan | Admin SDM |
|------|:--------:|:---------:|
| Mengajukan layanan | ✅ | – |
| Simpan draft | ✅ | – |
| Batalkan sebelum diproses | ✅ | – |
| Edit & kirim ulang saat "Perlu revisi" | ✅ | – |
| Lihat riwayat & status milik sendiri | ✅ | – |
| Lihat semua pengajuan | – | ✅ |
| Ubah status pengajuan | – | ✅ |
| Minta revisi / tolak | – | ✅ |
| Cetak & ekspor rekap | – | ✅ |

## 5. Fitur (MoSCoW) & user stories
**Must have (versi pertama).** Urutan bangun layanan: 1) Klaim Perdin → 2) Klaim Perdin Diklat → 3) Permohonan SPPD → 4) Pemesanan Tiket Pesawat.

| ID | User story |
|----|-----------|
| US-01 | Sebagai Karyawan, saya ingin mengajukan **Klaim Biaya Perdin** dengan mencantumkan Nomor Surat Tugas, supaya biaya perjalanan saya diganti. |
| US-02 | Sebagai Karyawan, saya ingin mengajukan **Klaim Biaya Perdin Diklat** dengan mencantumkan Nomor Surat Pemanggilan Workshop/Diklat, supaya biaya diklat saya diganti. |
| US-03 | Sebagai Karyawan, saya ingin mengajukan **Permohonan SPPD** berdasarkan Nomor Surat Tugas, supaya perjalanan dinas saya tercatat resmi. |
| US-04 | Sebagai Karyawan, saya ingin mengajukan **Pemesanan Tiket Pesawat** yang terhubung ke Nomor Surat Tugas, supaya tiket dipesankan tanpa form manual. |
| US-05 | Sebagai Karyawan, saya ingin **mengunggah dokumen bukti**, supaya Admin tidak perlu meminta berkas cetak. |
| US-06 | Sebagai Karyawan, saya ingin **menyimpan draft** dan **membatalkan** pengajuan yang belum diproses, supaya saya bisa melengkapinya nanti atau menariknya jika salah. |
| US-07 | Sebagai Karyawan, saya ingin **mengedit & mengirim ulang** pengajuan berstatus "Perlu revisi" dengan nomor yang sama, supaya tidak perlu mengajukan dari awal. |
| US-08 | Sebagai Karyawan, saya ingin **melihat riwayat & status** pengajuan dan menerima **notifikasi WA/email**, supaya saya tahu progresnya tanpa bertanya. |
| US-09 | Sebagai Admin SDM, saya ingin **melihat semua pengajuan di satu tempat**, supaya tidak perlu mengecek email, WA, dan E-Office. |
| US-10 | Sebagai Admin SDM, saya ingin **mengubah status, meminta revisi, atau menolak** dengan alasan, supaya karyawan tahu tindak lanjutnya. |
| US-11 | Sebagai Admin SDM, saya ingin **diperingatkan jika ada pengajuan ganda**, supaya tidak terjadi double bayar. |
| US-12 | Sebagai Admin SDM, saya ingin **dashboard rekap** serta **cetak & ekspor**, supaya pelaporan dan arsip lebih mudah. |

Should / Could have: belum ada. Won't have: lihat bagian 3.

## 6. Alur pengguna utama
Keterkaitan layanan: **SPPD → Tiket → Klaim**, dengan **Nomor Surat Tugas** sebagai penghubung ketiganya. Klaim Diklat memakai Nomor Surat Pemanggilan Workshop/Diklat. Satu Surat Tugas bisa berlaku untuk beberapa karyawan.

**Status pengajuan:** Draft → Dikirim → Diproses → Selesai / Ditolak, dengan tambahan Perlu revisi → (edit & kirim ulang, nomor sama) → Dikirim.

**Alur Karyawan**
1. Login, lalu pilih layanan.
2. Isi form dan cantumkan Nomor Surat Tugas / Surat Pemanggilan.
3. Unggah dokumen bukti.
4. Simpan sebagai draft, atau kirim.
5. Sistem mengecek duplikat, lalu status berubah menjadi "Dikirim" dan notifikasi terkirim.
6. Pantau status. Jika "Perlu revisi", edit lalu kirim ulang.

**Alur Admin SDM**
1. Buka daftar pengajuan masuk.
2. Periksa isi dan dokumen.
3. Ubah status menjadi Diproses, lalu Selesai, Ditolak, atau Perlu revisi (dengan alasan).
4. Notifikasi terkirim ke karyawan.
5. Cetak/ekspor rekap bila perlu.

**Penanganan error**
- Pengajuan ganda terdeteksi: lihat pertanyaan terbuka #3.
- Dokumen wajib belum diunggah: tombol Kirim tidak aktif *(asumsi)*.
- Koneksi terputus saat mengisi: isian tersimpan sebagai draft *(asumsi)*.

## 7. Kebutuhan data
*(Ronde 5, belum diisi)*

## 8. Teknis & integrasi
*(Ronde 6, belum diisi)*

## 9. Kebutuhan non-fungsional
*(Ronde 7, belum diisi)*

## 10. Ukuran sukses
*(Ronde 8, belum diisi)*

## 11. Rencana rilis
Versi pertama berisi semua Must have di bagian 5, dibangun sesuai urutan layanan.

## 12. Asumsi & pertanyaan terbuka
**Asumsi** (mohon dicek):
- A1. Dokumen wajib harus lengkap sebelum pengajuan bisa dikirim.
- A2. Isian otomatis tersimpan sebagai draft.
- A3. Notifikasi dikirim setiap kali status berubah.

**Pertanyaan terbuka:**
1. Dampak dalam angka (jumlah klaim per bulan, frekuensi double bayar, waktu pengecekan).
2. Jumlah pengguna (Karyawan dan Admin SDM).
3. Aturan duplikat. Usulan: kombinasi **Nomor Surat Tugas + karyawan + jenis layanan** hanya boleh ada satu pengajuan aktif. Jika terdeteksi duplikat, sistem **memblokir** atau cukup **memberi peringatan**?
4. Dokumen bukti apa saja yang wajib untuk tiap layanan?

## Riwayat revisi
| Versi | Tanggal | Perubahan |
|-------|---------|-----------|
| 0.1 | 25-09-2026 | Draft Ronde 1–4 |
