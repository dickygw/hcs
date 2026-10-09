/**
 * HCS-POC — uji kecepatan Apps Script + Sheets (Build Plan v3.0 Tahap 0).
 * KODE BUANGAN: dihapus setelah uji lulus. Hanya data dummy.
 *
 * Rancangan v5 (mengikuti PRD v2.2 7.1 dan 9.1):
 * - Sheet aktif kecil: pengajuan berjalan + selesai/ditolak ≤ 90 hari. Sisanya di arsip per tahun.
 * - Satu kali baca getDataRange().getValues(), olah di memori.
 * - Cache server untuk sheet aktif dan master (kecil, aman dari batas CacheService);
 *   setelah menulis, cache diperbarui di tempat, tidak dibuang.
 * - Kunci sesingkat mungkin: nomor dari penghitung, appendRow, perbarui cache kecil.
 * - Daftar per halaman; satu panggilan per layar.
 */

const UKURAN_HALAMAN = 20;
const CACHE_DETIK = 21600; // 6 jam; sheet hanya diubah lewat kode ini, cache selalu diperbarui saat menulis
const POTONGAN = 90000; // batas CacheService 100 KB per kunci
const TAHUN_ARSIP = 3;

// ---------------------------------------------------------------------------
// Web app
// ---------------------------------------------------------------------------
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('HCS · Uji kecepatan')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Satu-satunya fungsi yang dipanggil browser. Aksi di luar daftar ditolak.
 * Fungsi lain berakhiran _ sehingga tidak bisa dipanggil lewat google.script.run.
 */
function api(aksi, arg) {
  const mulai = Date.now();
  const email = Session.getActiveUser().getEmail();
  if (!email || !/@pegadaian\.co\.id$/.test(email)) throw new Error('Akses ditolak.');
  const fungsi = AKSI_[aksi];
  if (!fungsi) throw new Error('Aksi tidak dikenal.');
  const hasil = fungsi(arg || {}, email);
  return { data: hasil.data, cache: hasil.cache || '', serverMs: Date.now() - mulai };
}

const AKSI_ = {
  awal: aksiAwal_,
  riwayat: aksiRiwayat_,
  detail: aksiDetail_,
  dataForm: aksiDataForm_,
  kirim: aksiKirim_,
  unggah: aksiUnggah_,
  tugasku: aksiTugasku_,
  detailAdmin: aksiDetailAdmin_,
  ubahStatus: aksiUbahStatus_,
  ekspor: aksiEkspor_,
  simulasi: aksiSimulasi_,
  catatKinerja: aksiCatatKinerja_,
  hasil: aksiHasil_,
};

// ---------------------------------------------------------------------------
// Akses data
// ---------------------------------------------------------------------------
const LETAK_ = {
  Karyawan: 'Master', TAD: 'Master', TarifSPPD: 'Master',
  Pengajuan: 'Data', PengajuanTAD: 'Data', RiwayatStatus: 'Data',
  LogKinerja: 'Log',
};

function ss_(nama) {
  const id = PropertiesService.getScriptProperties().getProperty('SS_' + nama);
  if (!id) throw new Error('Jalankan siapkanPoc dan isiDataDummy dulu.');
  return SpreadsheetApp.openById(id);
}

/** Sheet aktif, atau sheet arsip bila nama berakhiran _TAHUN (mis. Pengajuan_2025). Arsip yang belum ada → null. */
function sheet_(tabel) {
  return /_\d{4}$/.test(tabel) ? ss_('Arsip').getSheetByName(tabel) : ss_(LETAK_[tabel]).getSheetByName(tabel);
}

/** Baris tabel (tanpa header). Dari cache bila ada; jika tidak, satu kali getDataRange().getValues(). */
function baca_(tabel) {
  const cache = CacheService.getScriptCache();
  const jumlah = Number(cache.get('n_' + tabel) || 0);
  if (jumlah) {
    const kunci = [];
    for (let i = 0; i < jumlah; i++) kunci.push('c_' + tabel + '_' + i);
    const isi = cache.getAll(kunci);
    if (Object.keys(isi).length === jumlah) return { baris: JSON.parse(kunci.map((k) => isi[k]).join('')), cache: 'hit' };
  }
  const sh = sheet_(tabel);
  const baris = sh ? sh.getDataRange().getValues().slice(1) : [];
  simpanCache_(tabel, baris);
  return { baris: baris, cache: 'miss' };
}

/** Simpan seluruh tabel ke cache, dipecah per 90 KB. Hanya untuk tabel kecil (aktif, master, arsip per tahun). */
function simpanCache_(tabel, baris) {
  const cache = CacheService.getScriptCache();
  const teks = JSON.stringify(baris);
  const potongan = {};
  let n = 0;
  for (let i = 0; i < teks.length; i += POTONGAN) potongan['c_' + tabel + '_' + n++] = teks.slice(i, i + POTONGAN);
  try {
    cache.putAll(potongan, CACHE_DETIK);
    cache.put('n_' + tabel, String(n), CACHE_DETIK);
  } catch (e) {
    cache.remove('n_' + tabel); // ponytail: terlalu besar untuk cache → tetap jalan tanpa cache
  }
}

/** Teks diawali = + - @ dinetralkan agar tidak menjadi rumus (INPUT-02). */
function aman_(baris) {
  return baris.map((v) => (typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v));
}

/** Tambah satu baris dengan appendRow (satu panggilan) dan perbarui cache di tempat. Panggil di dalam kunci. */
function tambahBaris_(tabel, baris) {
  const isi = baca_(tabel).baris;
  const bersih = aman_(baris);
  sheet_(tabel).appendRow(bersih);
  isi.push(bersih);
  simpanCache_(tabel, isi);
}

/** Untuk data dummy dan log: tulis blok sekaligus; tambah baris sheet bila kurang. */
function tulisMulai_(sh, baris, nilai) {
  const perlu = baris + nilai.length - 1 - sh.getMaxRows();
  if (perlu > 0) sh.insertRowsAfter(sh.getMaxRows(), perlu);
  sh.getRange(baris, 1, nilai.length, nilai[0].length).setValues(nilai);
}

/** Jalankan fn di dalam kunci; hasil diberi catatan waktu tunggu antrean dan waktu kerja di dalam kunci. */
function denganKunci_(fn) {
  const kunci = LockService.getScriptLock();
  const t0 = Date.now();
  kunci.waitLock(30000);
  const t1 = Date.now();
  try {
    const hasil = fn();
    hasil.waktu = { tungguMs: t1 - t0, dalamKunciMs: Date.now() - t1 };
    return hasil;
  } finally {
    kunci.releaseLock();
  }
}

// Kolom Pengajuan
const P = {
  nomor: 0, jenis: 1, nik: 2, nama: 3, noST: 4, tujuan: 5, berangkat: 6, kembali: 7,
  menginap: 8, jarak: 9, moda: 10, dinas: 11, golongan: 12, status: 13, dibuat: 14, diperbarui: 15, jumlahTad: 16, nominal: 17,
};

function ringkas_(r, tahunArsip) {
  return { nomor: r[P.nomor], jenis: r[P.jenis], noST: r[P.noST], nama: r[P.nama], tujuan: r[P.tujuan], berangkat: r[P.berangkat], status: r[P.status], diperbarui: r[P.diperbarui], jumlahTad: r[P.jumlahTad], arsip: tahunArsip || '' };
}

const terbaru_ = (a, b) => (a[P.diperbarui] < b[P.diperbarui] ? 1 : -1);

// ---------------------------------------------------------------------------
// Aksi karyawan
// ---------------------------------------------------------------------------
function aksiAwal_(arg) {
  const r = aksiRiwayat_({ nik: arg.nik, ke: 0 });
  return { data: { riwayat: r.data }, cache: r.cache };
}

/**
 * Pengajuan saya. Halaman diambil dari sheet aktif dulu; arsip per tahun (terbaru dulu)
 * baru dibaca bila halaman yang diminta melewati jumlah pengajuan aktif.
 */
function aksiRiwayat_(arg) {
  const aktif = baca_('Pengajuan');
  const daftar = aktif.baris.filter((r) => r[P.nik] === arg.nik).sort(terbaru_).map((r) => ringkas_(r));
  const cache = [aktif.cache];
  const perlu = ((arg.ke || 0) + 1) * UKURAN_HALAMAN;
  const tahunIni = new Date().getFullYear();
  let tahun = tahunIni;
  while (daftar.length < perlu + 1 && tahun > tahunIni - TAHUN_ARSIP) {
    const arsip = baca_('Pengajuan_' + tahun);
    arsip.baris.filter((r) => r[P.nik] === arg.nik).sort(terbaru_).forEach((r) => daftar.push(ringkas_(r, tahun)));
    cache.push(tahun + ':' + arsip.cache);
    tahun--;
  }
  const awal = (arg.ke || 0) * UKURAN_HALAMAN;
  return {
    data: { isi: daftar.slice(awal, awal + UKURAN_HALAMAN), ada: daftar.length > awal + UKURAN_HALAMAN, bacaArsip: cache.length > 1 },
    cache: cache.join('/'),
  };
}

/** Satu panggilan: pengajuan + riwayat status + TAD. Kepemilikan disaring di server. */
function aksiDetail_(arg) {
  const akhiran = arg.arsip ? '_' + Number(arg.arsip) : '';
  const p = baca_('Pengajuan' + akhiran);
  const baris = p.baris.find((r) => r[P.nomor] === arg.nomor && (arg.nik === undefined || r[P.nik] === arg.nik));
  if (!baris) throw new Error('Pengajuan tidak ditemukan.');
  const rs = baca_('RiwayatStatus' + akhiran);
  const tad = baca_('PengajuanTAD' + akhiran);
  return {
    data: {
      pengajuan: ringkas_(baris, arg.arsip),
      nominal: baris[P.status] === 'Selesai' ? baris[P.nominal] : null,
      riwayat: rs.baris.filter((r) => r[0] === arg.nomor).map((r) => ({ status: r[1], oleh: r[2], pada: r[3], catatan: r[4] })),
      tad: tad.baris.filter((r) => r[0] === arg.nomor).map((r) => ({ nama: r[2], nik: r[3], vendor: r[4] })),
    },
    cache: [p.cache, rs.cache, tad.cache].join('/'),
  };
}

/** Daftar TAD untuk saran nama: dikirim sekali, TANPA rekening, lalu dicari di perangkat. */
function aksiDataForm_() {
  const t = baca_('TAD');
  return { data: t.baris.map((r) => [r[0], r[1], r[2], r[3], r[4]]), cache: t.cache };
}

function aksiKirim_(arg, email) {
  return kirimPengajuan_(arg.nik, arg.form || {}, email, 'Dikirim');
}

/** Inti kirim pengajuan (dipakai juga simulasi). Di dalam kunci hanya: penghitung, appendRow, perbarui cache aktif. */
function kirimPengajuan_(nik, f, email, status) {
  const kini = new Date().toISOString();
  return denganKunci_(() => {
    const props = PropertiesService.getScriptProperties();
    const no = Number(props.getProperty('NOMOR_TERAKHIR') || 0) + 1;
    props.setProperty('NOMOR_TERAKHIR', String(no));
    const nomor = 'KP-' + String(no).padStart(5, '0');
    tambahBaris_('Pengajuan', [nomor, 'Klaim Biaya Perdin', nik, f.nama || '', f.noST || '', f.tujuan || '', f.berangkat || '', f.kembali || '', f.menginap ? 'Ya' : 'Tidak', f.jarak || '', f.moda || '', f.dinas ? 'Ya' : 'Tidak', 'C', status, kini, kini, (f.tad || []).length, '']);
    tambahBaris_('RiwayatStatus', [nomor, status, email, kini, '']);
    (f.tad || []).forEach((t) => tambahBaris_('PengajuanTAD', [nomor, t[0], t[1], t[2], t[3]]));
    return { data: { nomor: nomor } };
  });
}

/** Unggah: jenis file diperiksa dari isi (magic bytes), maks 5 MB, nama acak, folder privat. */
function aksiUnggah_(arg) {
  const bytes = Utilities.base64Decode(arg.isi);
  if (bytes.length > 5 * 1024 * 1024) throw new Error('Ukuran file melebihi 5 MB.');
  const b = bytes.slice(0, 4).map((x) => (x + 256) % 256);
  const jenis = b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 ? 'application/pdf'
    : b[0] === 0xff && b[1] === 0xd8 ? 'image/jpeg'
    : b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 ? 'image/png' : null;
  if (!jenis) throw new Error('Unggah file PDF, JPG, atau PNG.');
  const folder = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('FOLDER_DOKUMEN'));
  const file = folder.createFile(Utilities.newBlob(bytes, jenis, Utilities.getUuid()));
  return { data: { ukuran: bytes.length, id: file.getId().slice(0, 6) + '…' } };
}

// ---------------------------------------------------------------------------
// Aksi Admin (sheet aktif)
// ---------------------------------------------------------------------------
const BERJALAN_ = (r) => r[P.status] === 'Dikirim' || r[P.status] === 'Diproses';

function aksiTugasku_(arg) {
  const t = baca_('Pengajuan');
  const cari = String(arg.cari || '').toLowerCase();
  const cocok = t.baris.filter((r) =>
    (arg.tab === 'TAD' ? r[P.jumlahTad] > 0 : true) &&
    (arg.status ? r[P.status] === arg.status : BERJALAN_(r)) &&
    (arg.jenis ? r[P.jenis] === arg.jenis : true) &&
    (!cari || String(r[P.nomor]).toLowerCase().includes(cari) || String(r[P.nama]).toLowerCase().includes(cari) || String(r[P.noST]).toLowerCase().includes(cari)));
  cocok.sort((a, b) => (a[P.dibuat] < b[P.dibuat] ? 1 : -1));
  const awal = (arg.ke || 0) * UKURAN_HALAMAN;
  return {
    data: {
      isi: cocok.slice(awal, awal + UKURAN_HALAMAN).map((r) => ringkas_(r)),
      ada: cocok.length > awal + UKURAN_HALAMAN,
      hitung: { Karyawan: t.baris.filter(BERJALAN_).length, TAD: t.baris.filter((r) => BERJALAN_(r) && r[P.jumlahTad] > 0).length },
    },
    cache: t.cache,
  };
}

function aksiUbahStatus_(arg, email) {
  const kini = new Date().toISOString();
  return denganKunci_(() => {
    const p = baca_('Pengajuan'); // posisi baris diketahui dari cache, tanpa membaca sheet
    const i = p.baris.findIndex((r) => r[P.nomor] === arg.nomor);
    if (i < 0) throw new Error('Pengajuan tidak ditemukan.');
    const baris = p.baris[i];
    baris[P.status] = arg.status;
    baris[P.diperbarui] = kini;
    sheet_('Pengajuan').getRange(i + 2, 1, 1, baris.length).setValues([aman_(baris)]);
    simpanCache_('Pengajuan', p.baris);
    tambahBaris_('RiwayatStatus', [arg.nomor, arg.status, email, kini, arg.catatan || '']);
    return { data: { status: arg.status }, cache: p.cache };
  });
}

function aksiEkspor_(arg) {
  const t = baca_('Pengajuan');
  const cocok = t.baris.filter((r) => (arg.status ? r[P.status] === arg.status : true) && (arg.jenis ? r[P.jenis] === arg.jenis : true));
  return { data: cocok.map((r) => [r[P.nomor], r[P.jenis], r[P.nama], r[P.noST], r[P.status], r[P.dibuat]]), cache: t.cache };
}

// ---------------------------------------------------------------------------
// Perhitungan SPPD (disederhanakan untuk uji kecepatan; mesin lengkap di Tahap 9)
// ---------------------------------------------------------------------------
function hitungSppd_(pengajuan, tarif) {
  const hari = Math.max(1, Math.round((new Date(pengajuan.kembali) - new Date(pengajuan.berangkat)) / 86400000) + 1);
  const t = tarif[pengajuan.golongan] || tarif.C;
  if (pengajuan.menginap === 'Ya') return hari * t.harian + 2 * t.bandara;
  return Number(t[pengajuan.jarak === '>60' ? 'jauh' : 'dekat']);
}

/** Detail Admin + hitung SPPD dalam satu panggilan. */
function aksiDetailAdmin_(arg) {
  const d = aksiDetail_({ nomor: arg.nomor, arsip: arg.arsip });
  const p = baca_('Pengajuan' + (arg.arsip ? '_' + Number(arg.arsip) : '')).baris.find((r) => r[P.nomor] === arg.nomor);
  const tr = baca_('TarifSPPD');
  const tarif = {};
  tr.baris.forEach((r) => (tarif[r[0]] = { harian: r[1], bandara: r[2], dekat: r[3], jauh: r[4] }));
  const isi = { golongan: p[P.golongan], menginap: p[P.menginap], jarak: p[P.jarak], berangkat: p[P.berangkat], kembali: p[P.kembali] };
  d.data.hitung = {
    karyawan: hitungSppd_(isi, tarif),
    tad: d.data.tad.map((t) => ({ nama: t.nama, nominal: Math.round(hitungSppd_(Object.assign({}, isi, { golongan: 'TAD' }), tarif)) })),
  };
  d.cache += '/' + tr.cache;
  return d;
}

// ---------------------------------------------------------------------------
// Kinerja dan simulasi
// ---------------------------------------------------------------------------
function aksiCatatKinerja_(arg, email) {
  if (!arg.baris || !arg.baris.length) return { data: 0 };
  const baris = arg.baris.map((b) => [new Date().toISOString(), b.aksi, b.totalMs, b.serverMs, b.perangkat, email, b.sukses ? 'Ya' : 'Tidak', b.cache || '']);
  // Log hanya ditambah: appendRow per baris aman dipakai bersamaan, tanpa kunci.
  const sh = sheet_('LogKinerja');
  baris.forEach((b) => sh.appendRow(b));
  return { data: baris.length };
}

/** Satu permintaan simulasi = satu kiriman pengajuan sungguhan (status "Simulasi", tidak masuk Tugasku). */
function aksiSimulasi_(arg, email) {
  const h = kirimPengajuan_('SIMULASI', { noST: 'SIM' }, email, 'Simulasi');
  return { data: h.waktu };
}

function aksiHasil_() {
  const baris = sheet_('LogKinerja').getDataRange().getValues().slice(1);
  const kelompok = {};
  baris.forEach((r) => {
    const k = r[1] + '|' + r[4];
    const g = (kelompok[k] = kelompok[k] || { aksi: r[1], perangkat: r[4], ms: [], server: [], hit: 0, adaCache: 0, gagal: 0 });
    g.ms.push(Number(r[2]));
    if (Number(r[3])) g.server.push(Number(r[3]));
    if (r[7] && /hit|miss/.test(r[7])) {
      g.adaCache++;
      if (!/miss/.test(r[7])) g.hit++;
    }
    if (r[6] !== 'Ya') g.gagal++;
  });
  const persentil = (a, p) => {
    const s = a.slice().sort((x, y) => x - y);
    return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
  };
  return {
    data: Object.keys(kelompok).map((k) => {
      const g = kelompok[k];
      return {
        aksi: g.aksi, perangkat: g.perangkat, n: g.ms.length, median: persentil(g.ms, 50), p75: persentil(g.ms, 75), gagal: g.gagal,
        serverMedian: g.server.length ? persentil(g.server, 50) : null,
        cachePersen: g.adaCache ? Math.round((100 * g.hit) / g.adaCache) : null,
      };
    }),
  };
}
