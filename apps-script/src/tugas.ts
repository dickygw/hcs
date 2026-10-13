/**
 * Sisi Admin: A2 Tugasku dan perubahan status (PRD 5.1–5.2). Semua pengajuan terkirim otomatis masuk Tugasku.
 * Perubahan status di dalam kunci dan dicek terhadap status yang dilihat Admin, sehingga dua Admin tidak saling menimpa (INPUT-05).
 * Rekening hanya keluar tersamar (PRD 6.4).
 */
import { GalatPengguna, type Pemanggil } from "./akses";
import { bersihkanIsian, konfig, samarNik, type Gudang } from "./pengajuan";
import { PER_HALAMAN } from "./master";

const salah = (pesan: string) => new GalatPengguna(pesan);
/** Antrean kerja: yang sudah dikirim karyawan dan belum diputuskan. */
const STATUS_TUGAS = ["dikirim", "diproses"];

/** Perpindahan status yang boleh dilakukan Admin pada tahap ini. Selesai dibangun di Tahap 9. */
export const AKSI: Record<string, { dari: readonly string[]; ke: string; catatanWajib?: string }> = {
  proses: { dari: ["dikirim"], ke: "diproses" },
  revisi: { dari: ["dikirim", "diproses"], ke: "perlu_revisi", catatanWajib: "Tulis catatan revisi untuk karyawan." },
  tolak: { dari: ["dikirim", "diproses"], ke: "ditolak", catatanWajib: "Tulis alasan penolakan." },
};

const RENTANG_HARI: Record<string, number> = { hari_ini: 1, "7_hari": 7, "30_hari": 30 };

export function tugasku(g: Gudang, arg: unknown, kini = new Date()) {
  const a = (arg ?? {}) as Record<string, unknown>;
  const tab = a.tab === "tad" ? "tad" : "karyawan";
  const cari = String(a.cari ?? "").trim().toLowerCase().slice(0, 100);
  const status = STATUS_TUGAS.includes(String(a.status)) ? [String(a.status)] : STATUS_TUGAS;
  const jenis = String(a.jenis ?? "");
  const hari = RENTANG_HARI[String(a.rentang)] ?? 0;
  const batas = hari ? new Date(+kini - hari * 86_400_000).toISOString() : "";
  const ke = Math.max(0, Math.min(10_000, Math.floor(Number(a.halaman) || 0)));

  const nama = new Map(g.baca("karyawan").map((k) => [k.prim_email, k.nama]));
  const layanan = new Map(g.baca("jenis_layanan").map((l) => [l.kode, l.nama]));
  const tadMaster = new Map(g.baca("tad").map((t) => [t.id, t]));
  const tadPj = g.baca("pengajuan_tad").filter((t) => t.aktif === "ya");

  const antrean = g.baca("pengajuan").filter((x) => STATUS_TUGAS.includes(x.status));
  const cocok = antrean.filter((x) => status.includes(x.status) && (!jenis || x.jenis_layanan === jenis) && (!batas || x.dikirim_pada >= batas));
  const tadDari = (nomor: string) => tadPj.filter((t) => t.nomor_pengajuan === nomor);
  const penanda = (nomor: string) => {
    const t = tadDari(nomor);
    const p: string[] = [];
    if (t.some((x) => tadMaster.get(x.tad_id)?.terverifikasi !== "ya")) p.push("TAD belum terdaftar");
    if (t.some((x) => x.status_rekening !== "lengkap")) p.push("Rekening TAD kosong");
    return p;
  };
  const dasar = (x: (typeof antrean)[number]) => ({
    nomor: x.nomor, jenis: layanan.get(x.jenis_layanan) ?? x.jenis_layanan, noSuratTugas: x.no_surat_tugas, masuk: x.dikirim_pada, status: x.status,
  });

  // Tab Karyawan: satu baris per pengajuan. Tab TAD: satu baris per TAD di pengajuan itu.
  const semuaBaris =
    tab === "karyawan"
      ? cocok.map((x) => ({ ...dasar(x), nama: nama.get(x.pemilik_email) ?? x.pemilik_email, penanda: penanda(x.nomor) }))
      : cocok.flatMap((x) =>
          tadDari(x.nomor).map((t) => {
            const m = tadMaster.get(t.tad_id);
            const p: string[] = [];
            if (m?.terverifikasi !== "ya") p.push("TAD belum terdaftar");
            if (t.status_rekening !== "lengkap") p.push("Rekening TAD kosong");
            return { ...dasar(x), nama: m?.nama ?? "-", pengaju: nama.get(x.pemilik_email) ?? x.pemilik_email, vendor: m?.vendor ?? "", penanda: p };
          }),
        );
  const terpilih = (cari
    ? semuaBaris.filter((b) => [b.nomor, b.nama, b.noSuratTugas, "pengaju" in b ? b.pengaju : ""].join(" ").toLowerCase().includes(cari))
    : semuaBaris
  ).sort((x, y) => y.masuk.localeCompare(x.masuk));

  return {
    hitung: { karyawan: antrean.length, tad: antrean.reduce((n, x) => n + tadDari(x.nomor).length, 0) },
    total: terpilih.length,
    baris: terpilih.slice(ke * PER_HALAMAN, (ke + 1) * PER_HALAMAN),
  };
}

/** A3 (dasar): satu panggilan memuat isian, pemohon, TAD (rekening tersamar), dokumen, riwayat. */
export function bukaPengajuanAdmin(g: Gudang, arg: unknown, samar: (terenkripsi: string) => string) {
  const nomor = String((arg as { nomor?: unknown } | null)?.nomor ?? "");
  const x = g.baca("pengajuan").find((p) => p.nomor === nomor && p.status !== "draf");
  if (!x) throw salah("Pengajuan tidak ditemukan.");
  const karyawan = g.baca("karyawan");
  const nama = new Map(karyawan.map((k) => [k.prim_email, k.nama]));
  const pemohon = karyawan.find((k) => k.prim_email === x.pemilik_email);
  const tadMaster = new Map(g.baca("tad").map((t) => [t.id, t]));
  return {
    nomor: x.nomor,
    jenis: x.jenis_layanan,
    namaLayanan: g.baca("jenis_layanan").find((l) => l.kode === x.jenis_layanan)?.nama ?? x.jenis_layanan,
    labelSurat: konfig(x.jenis_layanan).singkat,
    status: x.status,
    isian: bersihkanIsian(x),
    pemohon: {
      nama: pemohon?.nama ?? x.pemilik_email, email: x.pemilik_email, nik: x.nik_pendek,
      // Data yang dikunci saat dikirim (PRD 5.6).
      jabatan: x.jabatan_terkunci, unit: x.unit_kerja_terkunci, jg: x.jg_terkunci, golongan: x.golongan_terkunci,
    },
    tad: g.baca("pengajuan_tad").filter((t) => t.nomor_pengajuan === x.nomor && t.aktif === "ya").map((t) => {
      const m = tadMaster.get(t.tad_id);
      return {
        id: t.tad_id, nama: m?.nama ?? "-", nik: samarNik(m?.nik ?? ""), vendor: m?.vendor ?? "", bank: t.nama_bank_terkunci,
        rekening: t.rekening_terkunci ? samar(t.rekening_terkunci) : "", terverifikasi: m?.terverifikasi === "ya",
      };
    }),
    dokumen: g.baca("dokumen").filter((d) => d.nomor_pengajuan === x.nomor).map((d) => ({ id: d.id, jenis: d.jenis, nama: d.nama_asli, tipe: d.tipe_mime, ukuran: +d.ukuran_byte })),
    riwayat: g.baca("riwayat_status").filter((r) => r.nomor_pengajuan === x.nomor).sort((a, b) => a.pada.localeCompare(b.pada))
      .map((r) => ({ status: r.status_ke, pada: r.pada, oleh: nama.get(r.oleh_email) ?? r.oleh_email.split("@")[0], catatan: r.catatan })),
    aksi: Object.entries(AKSI).filter(([, a]) => a.dari.includes(x.status)).map(([k]) => k),
  };
}

/** FILE-04: Admin boleh membuka semua dokumen pengajuan yang sudah dikirim. */
export function unduhDokumenAdmin(g: Gudang, arg: unknown) {
  const d = g.baca("dokumen").find((x) => x.id === String((arg as { id?: unknown } | null)?.id ?? ""));
  const pj = d && g.baca("pengajuan").find((x) => x.nomor === d.nomor_pengajuan);
  if (!d || !pj || pj.status === "draf") throw salah("Dokumen tidak ditemukan.");
  return { nama: d.nama_asli, tipe: d.tipe_mime, data: g.file.ambil(d.id_file_drive) };
}

/**
 * Proses, Minta revisi (catatan wajib), Tolak (alasan wajib). `dari` = status yang dilihat Admin di layar;
 * bila sudah diubah Admin lain, aksi ditolak agar tidak saling menimpa.
 */
export function ubahStatus(g: Gudang, p: Pemanggil, arg: unknown) {
  const a = (arg ?? {}) as Record<string, unknown>;
  if (!Object.hasOwn(AKSI, String(a.aksi))) throw salah("Aksi tidak dikenal.");
  const aksi = AKSI[String(a.aksi)]!;
  const catatan = String(a.catatan ?? "").trim().slice(0, 500);
  if (aksi.catatanWajib && catatan.length < 5) throw salah(aksi.catatanWajib);
  return g.kunci(() => {
    const semua = g.baca("pengajuan");
    const i = semua.findIndex((x) => x.nomor === String(a.nomor ?? ""));
    const x = semua[i];
    if (!x || x.status === "draf") throw salah("Pengajuan tidak ditemukan.");
    if (x.status !== String(a.dari ?? "")) throw salah("Pengajuan ini sudah diubah oleh Admin lain. Muat ulang untuk melihat status terbaru.");
    if (!aksi.dari.includes(x.status)) throw salah("Aksi ini tidak dapat dilakukan pada status sekarang.");
    const kini = g.kini();
    g.ubah("pengajuan", i, { ...x, status: aksi.ke, diperbarui_pada: kini });
    g.tambah("riwayat_status", [{ id: g.id(), nomor_pengajuan: x.nomor, status_dari: x.status, status_ke: aksi.ke, oleh_email: p.email, catatan, pada: kini }]);
    return { status: aksi.ke };
  });
}
