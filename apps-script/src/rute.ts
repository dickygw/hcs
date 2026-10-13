import { GalatPengguna, type Rute } from "./akses";
import { baca, denganKunci, gantiSemua, gudang, idBaru, sekarang, tambah, ubahBaris } from "./data";
import { dekripsi, enkripsi, kunciTersimpan, nonceBaru, samarkan } from "./enkripsi";
import { daftarKaryawan, daftarTad, isianKoreksiJg, sinkronHcms, sinkronTad, umurData } from "./master";
import * as P from "./pengajuan";
import { profilDari } from "./peran";
import { sesiSkrip } from "./sesi";

/** Kontak di layar U2. Kotak masuk bersama; hanya kontak, bukan akun login Admin (keputusan 09-10-2026). */
export const KONTAK_ADMIN_SDM = "manohc.balikpapan@pegadaian.co.id";

const urlAplikasi = () => ScriptApp.getService().getUrl();

/** Riwayat unggahan terbaru dan umur data (PRD 6.2). */
function riwayat_(jenis: "hcms" | "tad") {
  const daftar = baca("riwayat_sinkronisasi").filter((r) => r.jenis === jenis).reverse().slice(0, 5);
  return {
    umur: umurData(daftar[0]?.pada ?? "", new Date()),
    riwayat: daftar.map((r) => ({
      pada: r.pada, oleh: r.pengguna_email, namaFile: r.nama_file, baru: +r.jumlah_baru, berubah: +r.jumlah_berubah, nonaktif: +r.jumlah_nonaktif,
    })),
  };
}

function sinkronTad_(arg: unknown) {
  const kunci = kunciTersimpan();
  // ponytail: dekripsi semua rekening untuk membandingkan (±1.300 TAD); simpan sidik rekening bila terlalu lambat.
  return sinkronTad(arg, baca("tad"), {
    kini: sekarang(), idBaru, buka: (s) => dekripsi(s, kunci), kunci: (t) => enkripsi(t, kunci, nonceBaru()),
  });
}

/**
 * Daftar SEMUA fungsi server yang boleh dipanggil browser, beserta peran yang diizinkan (AKSES-01).
 * Fungsi yang tidak ada di daftar ini tidak dapat dipanggil dari browser.
 */
export const RUTE: Readonly<Record<string, Rute>> = {
  /** Dipanggil saat HCS dibuka dan saat "Masuk kembali". Email belum terdaftar → data layar U2. */
  mulai: {
    peran: ["domain"],
    tanpaSesi: true,
    jalankan: (_arg, p) => {
      if (!p.peran) return { terdaftar: false, email: p.email, kontak: KONTAK_ADMIN_SDM, urlAplikasi: urlAplikasi() };
      sesiSkrip().mulai(p.email);
      return { terdaftar: true, pengguna: profilDari(p.email, p.peran, baca("karyawan")) };
    },
  },
  /** AUTH-06: menghapus sesi HCS di server. */
  keluar: {
    peran: ["domain"],
    tanpaSesi: true,
    jalankan: (_arg, p) => {
      sesiSkrip().akhiri(p.email);
      return { urlAplikasi: urlAplikasi() };
    },
  },

  // --- A5 Data karyawan (Admin)
  dataKaryawan: {
    peran: ["admin"],
    jalankan: (arg) => ({ ...daftarKaryawan(baca("karyawan"), arg), ...riwayat_("hcms") }),
  },
  /** Langkah 2–3 wizard: pemeriksaan dan ringkasan perubahan, belum menyimpan apa pun. */
  pratinjauHcms: {
    peran: ["admin"],
    jalankan: (arg) => sinkronHcms(arg, baca("karyawan"), sekarang()).ringkasan,
  },
  terapkanHcms: {
    peran: ["admin"],
    jalankan: (arg, p) =>
      denganKunci(() => {
        const kini = sekarang();
        const { ringkasan: r, hasil } = sinkronHcms(arg, baca("karyawan"), kini);
        if (r.masalah.length) throw new GalatPengguna("File masih memiliki baris bermasalah. Perbaiki lalu unggah ulang.");
        gantiSemua("karyawan", hasil);
        const jumlah = { baru: r.baru.length, berubah: r.berubahJg.length + r.pindahUnit.length, nonaktif: r.nonaktif.length };
        tambah("riwayat_sinkronisasi", [{
          id: idBaru(), jenis: "hcms", pengguna_email: p.email, nama_file: r.namaFile,
          jumlah_baru: String(jumlah.baru), jumlah_berubah: String(jumlah.berubah), jumlah_nonaktif: String(jumlah.nonaktif), pada: kini,
        }]);
        return jumlah;
      }),
  },
  /** Koreksi JG untuk Perdin: beralasan, tercatat, tidak tertimpa sinkronisasi (PRD 5.5). */
  koreksiJg: {
    peran: ["admin"],
    jalankan: (arg, p) => {
      const { nik, jg, alasan } = isianKoreksiJg(arg);
      return denganKunci(() => {
        const semua = baca("karyawan");
        const i = semua.findIndex((k) => k.nik_pendek === nik);
        if (i < 0) throw new GalatPengguna("Karyawan tidak ditemukan.");
        const lama = semua[i]!;
        const kini = sekarang();
        ubahBaris("karyawan", i, { ...lama, jg_perdin_override: jg, diperbarui_pada: kini });
        tambah("log_perubahan", [{
          id: idBaru(), pengguna_email: p.email, tabel: "karyawan", kunci_baris: nik, jenis_perubahan: "koreksi_jg",
          nilai_lama: lama.jg_perdin_override, nilai_baru: jg, alasan, pada: kini,
        }]);
        return { ok: true };
      });
    },
  },

  // --- A6 Data TAD (Admin). Rekening hanya keluar tersamar.
  dataTad: {
    peran: ["admin"],
    jalankan: (arg) => {
      const kunci = kunciTersimpan();
      return { ...daftarTad(baca("tad"), arg, (s) => samarkan(dekripsi(s, kunci))), ...riwayat_("tad") };
    },
  },
  pratinjauTad: {
    peran: ["admin"],
    jalankan: (arg) => sinkronTad_(arg).ringkasan,
  },
  terapkanTad: {
    peran: ["admin"],
    jalankan: (arg, p) =>
      denganKunci(() => {
        const { ringkasan: r, hasil } = sinkronTad_(arg);
        if (!r.baru.length && !r.berubah.length && !r.nonaktif.length) throw new GalatPengguna("Tidak ada perubahan untuk diterapkan.");
        gantiSemua("tad", hasil);
        const jumlah = { baru: r.baru.length, berubah: r.berubah.length, nonaktif: r.nonaktif.length };
        tambah("riwayat_sinkronisasi", [{
          id: idBaru(), jenis: "tad", pengguna_email: p.email, nama_file: r.namaFile,
          jumlah_baru: String(jumlah.baru), jumlah_berubah: String(jumlah.berubah), jumlah_nonaktif: String(jumlah.nonaktif), pada: sekarang(),
        }]);
        return { ...jumlah, dilewati: r.masalah.length };
      }),
  },

  // --- Karyawan: pengajuan (K1–K4). Kepemilikan diperiksa di pengajuan.ts (AKSES-02).
  pengajuanSaya: { peran: ["karyawan"], jalankan: (_a, p) => P.pengajuanSaya(gudang(), p) },
  bukaPengajuan: { peran: ["karyawan"], jalankan: (a, p) => P.bukaPengajuan(gudang(), p, a) },
  /** Daftar saran TAD tanpa rekening, dikirim sekali lalu dicari di perangkat (PRD 5.7, 9.1 #5). */
  saranTad: { peran: ["karyawan"], jalankan: () => P.saranTad(gudang()) },
  simpanDraf: { peran: ["karyawan"], jalankan: (a, p) => P.simpanDraf(gudang(), p, a) },
  unggahDokumen: {
    peran: ["karyawan"],
    // ponytail: base64 → byte di JavaScript (±1 dtk untuk 5 MB); pakai Blob langsung bila terasa lambat.
    jalankan: (a, p) => P.unggahDokumen(gudang(), p, a, (s) => Uint8Array.from(Utilities.base64Decode(s), (b) => (b + 256) % 256)),
  },
  hapusDokumen: { peran: ["karyawan"], jalankan: (a, p) => P.hapusDokumen(gudang(), p, a) },
  unduhDokumen: { peran: ["karyawan"], jalankan: (a, p) => P.unduhDokumen(gudang(), p, a) },
  kirimPengajuan: { peran: ["karyawan"], jalankan: (a, p) => P.kirimPengajuan(gudang(), p, a) },
  batalkanPengajuan: { peran: ["karyawan"], jalankan: (a, p) => P.batalkanPengajuan(gudang(), p, a) },
};
