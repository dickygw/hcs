/**
 * Sisi Admin: A2 Tugasku dan perubahan status (PRD 5.1–5.2). Semua pengajuan terkirim otomatis masuk Tugasku.
 * Perubahan status di dalam kunci dan dicek terhadap status yang dilihat Admin, sehingga dua Admin tidak saling menimpa (INPUT-05).
 * Rekening hanya keluar tersamar (PRD 6.4).
 */
import { GalatPengguna, type Pemanggil } from "./akses";
import { netralkan } from "./data";
import { GOLONGAN, hitungOrang, periksaAlasan, tarifBerlaku, type Gol, type Hasil, type Masukan } from "./hitung";
import { PER_HALAMAN, umurData } from "./master";
import { bersihkanIsian, konfig, samarNik, type Gudang } from "./pengajuan";
import type { Baris } from "./skema";

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
    aksi: [...Object.entries(AKSI).filter(([, a]) => a.dari.includes(x.status)).map(([k]) => k), ...(x.status === "diproses" ? ["selesai"] : [])],
    hitung: dataHitung(g, x),
    // Peringatan di atas panel (Design Brief A3): umur data karyawan saat ini.
    umurDataKaryawan: umurData(g.baca("riwayat_sinkronisasi").filter((r) => r.jenis === "hcms").at(-1)?.pada ?? "", new Date(g.kini())),
  };
}

// ---------------------------------------------------------------------------
// Perhitungan SPPD (Tahap 9). Isian Admin disimpan sebagai JSON di kolom rincian_hitung.
// ---------------------------------------------------------------------------
interface Simpanan {
  golongan?: string; // hanya bila golongan karyawan yang dikunci kosong (mis. JG 0 tanpa koreksi)
  orang?: Record<string, Masukan>; // kunci "karyawan" atau ID TAD
}
const KOMPONEN = ["harian_menginap", "harian_tidak_menginap_30_60", "harian_tidak_menginap_60", "transport_terminal", "sewa_rumah_bulanan"];

const simpananDari = (x: Baris<"pengajuan">): Simpanan => {
  try {
    return x.rincian_hitung ? (JSON.parse(x.rincian_hitung) as Simpanan) : {};
  } catch {
    return {};
  }
};

function orangDari(g: Gudang, x: Baris<"pengajuan">, golKaryawan: string) {
  const master = new Map(g.baca("tad").map((t) => [t.id, t]));
  const nama = g.baca("karyawan").find((k) => k.prim_email === x.pemilik_email)?.nama ?? x.pemilik_email;
  return [
    { kunci: "karyawan", nama, gol: golKaryawan },
    ...g.baca("pengajuan_tad").filter((t) => t.nomor_pengajuan === x.nomor && t.aktif === "ya")
      .map((t) => ({ kunci: t.tad_id, nama: master.get(t.tad_id)?.nama ?? "TAD", gol: "TAD" })),
  ];
}

/** Data untuk panel perhitungan A3: tarif yang berlaku (untuk pratinjau di layar Admin) dan isian tersimpan. */
function dataHitung(g: Gudang, x: Baris<"pengajuan">) {
  if (konfig(x.jenis_layanan).form !== "perjalanan") return null;
  const simpanan = simpananDari(x);
  const tanggal = x.tgl_berangkat;
  const semua = g.baca("tarif_sppd");
  const fungsi = tarifBerlaku(semua, tanggal);
  const tarif: Record<string, number> = {};
  for (const gol of GOLONGAN) for (const k of KOMPONEN) {
    try {
      tarif[`${gol}|${k}`] = fungsi(gol, k);
    } catch {
      // tarif yang tidak ada (mis. sewa rumah TAD) dibiarkan kosong; galat muncul saat dihitung
    }
  }
  return { tanggalTarif: tanggal, tarif, golonganTerkunci: x.golongan_terkunci, simpanan, orang: orangDari(g, x, x.golongan_terkunci || simpanan.golongan || "") };
}

/** Hitung ulang di server dari isian Admin; nominal dari browser tidak dipakai (INPUT-03). */
export function hitungPengajuan(g: Gudang, x: Baris<"pengajuan">, arg: unknown) {
  const a = (arg ?? {}) as Simpanan;
  const golKaryawan = x.golongan_terkunci || String(a.golongan ?? "");
  if (!["A", "B", "C"].includes(golKaryawan)) throw salah("Pilih golongan karyawan untuk perhitungan (JG terkunci kosong).");
  const tarif = tarifBerlaku(g.baca("tarif_sppd"), x.tgl_berangkat);
  const isian = bersihkanIsian(x);
  const masukan = a.orang && typeof a.orang === "object" ? a.orang : {};
  const orang = orangDari(g, x, golKaryawan).map((o) => {
    const m = Object.hasOwn(masukan, o.kunci) ? (masukan[o.kunci] ?? {}) : {};
    const hasil = hitungOrang(isian, o.gol as Gol, tarif, m);
    periksaAlasan(o.nama, hasil);
    return { ...o, masukan: m, hasil };
  });
  const simpanan: Simpanan & { hasil: Record<string, Hasil> } = {
    ...(x.golongan_terkunci ? {} : { golongan: golKaryawan }),
    orang: Object.fromEntries(orang.map((o) => [o.kunci, o.masukan])),
    hasil: Object.fromEntries(orang.map((o) => [o.kunci, o.hasil])),
  };
  return { orang, simpanan, total: orang.reduce((n, o) => n + o.hasil.total, 0) };
}

function cariUntukAdmin(g: Gudang, nomor: unknown, dari: unknown) {
  const semua = g.baca("pengajuan");
  const i = semua.findIndex((x) => x.nomor === String(nomor ?? ""));
  const x = semua[i];
  if (!x || x.status === "draf") throw salah("Pengajuan tidak ditemukan.");
  if (dari !== undefined && x.status !== String(dari)) throw salah("Pengajuan ini sudah diubah oleh Admin lain. Muat ulang untuk melihat status terbaru.");
  return { i, x };
}

/** Simpan isian perhitungan tanpa menyelesaikan (status Diproses). */
export function simpanHitung(g: Gudang, arg: unknown) {
  const a = (arg ?? {}) as { nomor?: unknown };
  return g.kunci(() => {
    const { i, x } = cariUntukAdmin(g, a.nomor, undefined);
    if (x.status !== "diproses") throw salah("Perhitungan hanya dapat diubah saat pengajuan Diproses.");
    const h = hitungPengajuan(g, x, arg);
    g.ubah("pengajuan", i, { ...x, rincian_hitung: JSON.stringify(h.simpanan), diperbarui_pada: g.kini() });
    return { total: h.total };
  });
}

/**
 * Selesai (PRD 5.2, 5.7): hanya dari Diproses, semua rekening TAD lengkap, perhitungan dihitung ulang di server,
 * penyesuaian beralasan tercatat di log_perubahan. Pemesanan Tiket selesai tanpa nominal.
 */
export function selesaikan(g: Gudang, p: Pemanggil, arg: unknown) {
  const a = (arg ?? {}) as { nomor?: unknown; dari?: unknown };
  return g.kunci(() => {
    const { i, x } = cariUntukAdmin(g, a.nomor, a.dari);
    if (x.status !== "diproses") throw salah("Pengajuan harus berstatus Diproses sebelum diselesaikan.");
    const semuaTad = g.baca("pengajuan_tad");
    const milik = semuaTad.filter((t) => t.nomor_pengajuan === x.nomor && t.aktif === "ya");
    if (milik.some((t) => t.status_rekening !== "lengkap")) throw salah("Lengkapi rekening TAD sebelum menyelesaikan pengajuan.");
    const kini = g.kini();
    let ubahan: Partial<Baris<"pengajuan">> = {};
    if (konfig(x.jenis_layanan).form === "perjalanan") {
      const h = hitungPengajuan(g, x, arg);
      ubahan = { rincian_hitung: JSON.stringify(h.simpanan), nominal_disetujui: String(h.total) };
      const perTad = new Map(h.orang.map((o) => [o.kunci, o.hasil.total]));
      g.gantiSemua("pengajuan_tad", semuaTad.map((t) => (t.nomor_pengajuan === x.nomor && t.aktif === "ya" ? { ...t, nominal_disetujui: String(perTad.get(t.tad_id) ?? 0), diperbarui_pada: kini } : t)));
      const log = h.orang.filter((o) => o.hasil.diubah).map((o) => ({
        id: g.id(), pengguna_email: p.email, tabel: "pengajuan", kunci_baris: `${x.nomor}/${o.kunci}`, jenis_perubahan: "penyesuaian_hitung",
        nilai_lama: "", nilai_baru: String(o.hasil.total), alasan: o.hasil.alasan, pada: kini,
      }));
      g.tambah("log_perubahan", log);
    }
    g.ubah("pengajuan", i, { ...x, ...ubahan, status: "selesai", disetujui_pada: kini, diperbarui_pada: kini });
    g.tambah("riwayat_status", [{ id: g.id(), nomor_pengajuan: x.nomor, status_dari: x.status, status_ke: "selesai", oleh_email: p.email, catatan: "", pada: kini }]);
    return { status: "selesai", total: ubahan.nominal_disetujui ?? "" };
  });
}

/**
 * Lengkapi rekening TAD (PRD 5.6, 5.7): BRI 15 digit, terenkripsi, dikunci di pengajuan dan disimpan ke data master.
 * Nomor rekening tidak ditulis ke log (DATA-04).
 */
export function lengkapiRekeningTad(g: Gudang, p: Pemanggil, arg: unknown, kunci: (t: string) => string) {
  const a = (arg ?? {}) as Record<string, unknown>;
  const bank = String(a.bank ?? "BRI").trim().toUpperCase().slice(0, 20) || "BRI";
  const rekening = String(a.rekening ?? "").replace(/\D/g, "");
  if (bank === "BRI" && rekening.length !== 15) throw salah("Rekening BRI harus 15 digit.");
  if (rekening.length < 8 || rekening.length > 20) throw salah("Nomor rekening tidak valid.");
  return g.kunci(() => {
    const { x } = cariUntukAdmin(g, a.nomor, undefined);
    if (!["dikirim", "diproses"].includes(x.status)) throw salah("Rekening hanya dapat dilengkapi sebelum pengajuan selesai.");
    const tadId = String(a.tadId ?? "");
    const semua = g.baca("pengajuan_tad");
    if (!semua.some((t) => t.nomor_pengajuan === x.nomor && t.tad_id === tadId && t.aktif === "ya")) throw salah("TAD tidak ditemukan di pengajuan ini.");
    const kini = g.kini();
    const sandi = kunci(rekening);
    g.gantiSemua("pengajuan_tad", semua.map((t) =>
      t.nomor_pengajuan === x.nomor && t.tad_id === tadId ? { ...t, nama_bank_terkunci: bank, rekening_terkunci: sandi, status_rekening: "lengkap", diperbarui_pada: kini } : t));
    const master = g.baca("tad");
    const j = master.findIndex((t) => t.id === tadId);
    if (j >= 0) g.ubah("tad", j, { ...master[j]!, nama_bank: bank, rekening_terenkripsi: sandi, terverifikasi: "ya", diperbarui_pada: kini });
    g.tambah("log_perubahan", [{
      id: g.id(), pengguna_email: p.email, tabel: "tad", kunci_baris: tadId, jenis_perubahan: "lengkapi_rekening",
      nilai_lama: "", nilai_baru: "", alasan: `Dilengkapi dari pengajuan ${x.nomor}`, pada: kini,
    }]);
    return { ok: true };
  });
}

// ---------------------------------------------------------------------------
// Ekspor Daftar Pembayaran SPPD Lumpsum untuk CMS payroll (keputusan user 13-10-2026).
// Karyawan dicocokkan lewat NIK (rekening karyawan tidak disimpan); rekening TAD lengkap → tercatat (PRD 6.4).
// ---------------------------------------------------------------------------
export const KOLOM_EKSPOR = [
  "No", "NIK", "Nama", "Grade", "Kegiatan", "Tanggal", "Unit Asal", "Unit Tujuan",
  "Uang Harian Unit Kerja Asal", "Quantity", "Uang Harian Kota Tujuan", "Quantity2", "Jumlah Uang Harian", "Transportasi",
  "Bantuan Sewa Rumah", "Hotel dan Tiket (at cost)", "Penyesuaian", "JUMLAH", "Nama Bank", "Nomor Rekening", "Keterangan",
];
const BULAN_PANJANG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/** 24-26 September 2026, 30 September-02 Oktober 2026 (format daftar pembayaran). */
export function tanggalDaftar(a: string, b: string) {
  if (!a) return "";
  const [y1, m1, d1] = a.split("-").map(Number) as [number, number, number];
  const [y2, m2, d2] = (b || a).split("-").map(Number) as [number, number, number];
  const dd = (n: number) => String(n).padStart(2, "0");
  if (a === (b || a)) return `${dd(d1)} ${BULAN_PANJANG[m1 - 1]} ${y1}`;
  if (y1 === y2 && m1 === m2) return `${dd(d1)}-${dd(d2)} ${BULAN_PANJANG[m2 - 1]} ${y2}`;
  return `${dd(d1)} ${BULAN_PANJANG[m1 - 1]}${y1 === y2 ? "" : " " + y1}-${dd(d2)} ${BULAN_PANJANG[m2 - 1]} ${y2}`;
}

export function eksporPembayaran(g: Gudang, p: Pemanggil, arg: unknown, buka: (terenkripsi: string) => string) {
  const a = (arg ?? {}) as Record<string, unknown>;
  const dari = String(a.dari ?? "");
  const sampai = String(a.sampai ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dari) || !/^\d{4}-\d{2}-\d{2}$/.test(sampai) || sampai < dari) throw salah("Pilih rentang tanggal disetujui yang benar.");
  const witaTanggal = (iso: string) => new Date(Date.parse(iso) + 8 * 3_600_000).toISOString().slice(0, 10);
  const pj = g.baca("pengajuan").filter((x) => x.status === "selesai" && konfig(x.jenis_layanan).form === "perjalanan" && x.disetujui_pada
    && witaTanggal(x.disetujui_pada) >= dari && witaTanggal(x.disetujui_pada) <= sampai)
    .sort((x, y) => x.disetujui_pada.localeCompare(y.disetujui_pada));
  const karyawan = new Map(g.baca("karyawan").map((k) => [k.prim_email, k]));
  const master = new Map(g.baca("tad").map((t) => [t.id, t]));
  const tadPj = g.baca("pengajuan_tad").filter((t) => t.aktif === "ya");
  const baris: string[][] = [];
  let jumlahRekening = 0;
  for (const x of pj) {
    const hasil = (JSON.parse(x.rincian_hitung || "{}") as { hasil?: Record<string, Hasil> }).hasil ?? {};
    const umum = [x.kegiatan, tanggalDaftar(x.tgl_berangkat, x.tgl_kembali), x.unit_kerja_terkunci, x.kota_tujuan];
    const angka = (h: Hasil | undefined) => {
      if (!h) return Array(10).fill("");
      return [h.tarifAsal, h.qtyAsal, h.qtyTujuan ? h.tarifTujuan : "", h.qtyTujuan || "", h.uangHarian, h.transport || "", h.sewa || "", h.hotel + h.tiket || "", h.penyesuaian || "", h.total].map(String);
    };
    const k = karyawan.get(x.pemilik_email);
    baris.push([x.nik_pendek, k?.nama ?? x.pemilik_email, x.jg_terkunci, ...umum, ...angka(hasil.karyawan), "", "", x.nomor]);
    for (const t of tadPj.filter((t) => t.nomor_pengajuan === x.nomor)) {
      const m = master.get(t.tad_id);
      const rek = t.rekening_terkunci ? buka(t.rekening_terkunci) : "";
      if (rek) jumlahRekening++;
      baris.push([m?.nik ?? "", m?.nama ?? "TAD", "TAD", ...umum, ...angka(hasil[t.tad_id]), t.nama_bank_terkunci, rek, `${x.nomor} (TAD)`]);
    }
  }
  if (!baris.length) throw salah("Tidak ada pengajuan Selesai pada rentang tanggal itu.");
  g.tambah("log_akses_rekening", [{
    id: g.id(), pengguna_email: p.email, jenis: "ekspor_pembayaran", nomor_pengajuan: pj.map((x) => x.nomor).join(",").slice(0, 1000),
    jumlah_rekening: String(jumlahRekening), pada: g.kini(),
  }]);
  // INPUT-04: isian berawalan = + - @ dinetralkan agar tidak menjadi rumus di Excel.
  return { kolom: KOLOM_EKSPOR, baris: baris.map((b, i) => [String(i + 1), ...b].map(netralkan)) };
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
