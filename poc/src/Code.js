/**
 * HCS-POC — uji kecepatan Apps Script + Sheets (Build Plan v3.0 Tahap 0).
 * KODE BUANGAN: dihapus setelah uji lulus. Hanya data dummy.
 *
 * Teknik yang diuji (PRD v2.2 bagian 9.1):
 * 1. satu kali baca getDataRange().getValues(), olah di memori; tulis sekaligus setValues()
 * 2. daftar dikirim per halaman, hanya kolom yang dibutuhkan
 * 3. satu panggilan per layar
 * 4. cache di server (CacheService, dipecah per 90 KB)
 * 6. tampilan optimistis (di Index.html)
 * 7. LockService hanya saat menulis
 */

const UKURAN_HALAMAN = 20;
const CACHE_DETIK = 600;
const POTONGAN = 90000; // batas CacheService 100 KB per kunci

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
// Akses data: baca sekaligus + cache, tulis sekaligus
// ---------------------------------------------------------------------------
function ss_(nama) {
  const id = PropertiesService.getScriptProperties().getProperty('SS_' + nama);
  if (!id) throw new Error('Jalankan siapkanPoc dulu.');
  return SpreadsheetApp.openById(id);
}

const LETAK_ = {
  Karyawan: 'Master', TAD: 'Master', TarifSPPD: 'Master',
  Pengajuan: 'Data', PengajuanTAD: 'Data', RiwayatStatus: 'Data',
  LogKinerja: 'Log',
};

function sheet_(tabel) {
  return ss_(LETAK_[tabel]).getSheetByName(tabel);
}

/** Baris tabel (tanpa header). Dari cache bila ada; jika tidak, satu kali getDataRange().getValues(). */
function baca_(tabel) {
  const cache = CacheService.getScriptCache();
  const jumlah = Number(cache.get('n_' + tabel) || 0);
  if (jumlah) {
    const kunci = [];
    for (let i = 0; i < jumlah; i++) kunci.push('c_' + tabel + '_' + i);
    const isi = cache.getAll(kunci);
    if (Object.keys(isi).length === jumlah) {
      return { baris: JSON.parse(kunci.map((k) => isi[k]).join('')), cache: 'hit' };
    }
  }
  const baris = sheet_(tabel).getDataRange().getValues().slice(1);
  simpanCache_(tabel, baris);
  return { baris: baris, cache: 'miss' };
}

/** Simpan seluruh tabel ke cache, dipecah per 90 KB. */
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
    cache.remove('n_' + tabel); // ponytail: tabel terlalu besar untuk cache → tetap jalan tanpa cache
  }
}

function lupakan_(tabel) {
  CacheService.getScriptCache().remove('n_' + tabel);
}

/** Teks diawali = + - @ dinetralkan agar tidak menjadi rumus (INPUT-02). */
function aman_(baris) {
  return baris.map((v) => (typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v));
}

/**
 * Tambah baris. Satu baris → appendRow (satu panggilan, aman dipakai bersamaan).
 * Bila isiCache diberikan (hasil baca_ di dalam kunci yang sama), cache diperbarui di tempat,
 * bukan dibuang; tanpa isiCache, cache tabel dibuang.
 */
function tambah_(tabel, baris, isiCache) {
  const sh = sheet_(tabel);
  const bersih = baris.map(aman_);
  if (bersih.length === 1) sh.appendRow(bersih[0]);
  else tulisMulai_(sh, sh.getLastRow() + 1, bersih);
  if (isiCache) {
    bersih.forEach((b) => isiCache.push(b));
    simpanCache_(tabel, isiCache);
  } else {
    lupakan_(tabel);
  }
}

/** Untuk isi data dummy: tulis blok besar sekaligus; tambah baris sheet bila kurang. */
function tulisMulai_(sh, baris, nilai) {
  const perlu = baris + nilai.length - 1 - sh.getMaxRows();
  if (perlu > 0) sh.insertRowsAfter(sh.getMaxRows(), perlu);
  sh.getRange(baris, 1, nilai.length, nilai[0].length).setValues(nilai);
}

function denganKunci_(fn) {
  const kunci = LockService.getScriptLock();
  kunci.waitLock(30000);
  try {
    return fn();
  } finally {
    kunci.releaseLock();
  }
}

// Kolom Pengajuan
const P = {
  nomor: 0, jenis: 1, nik: 2, nama: 3, noST: 4, tujuan: 5, berangkat: 6, kembali: 7,
  menginap: 8, jarak: 9, moda: 10, dinas: 11, golongan: 12, status: 13, dibuat: 14, diperbarui: 15, jumlahTad: 16, nominal: 17,
};

function ringkas_(r) {
  return { nomor: r[P.nomor], jenis: r[P.jenis], noST: r[P.noST], nama: r[P.nama], tujuan: r[P.tujuan], berangkat: r[P.berangkat], status: r[P.status], diperbarui: r[P.diperbarui], jumlahTad: r[P.jumlahTad] };
}

function halaman_(daftar, ke) {
  const awal = (ke || 0) * UKURAN_HALAMAN;
  return { isi: daftar.slice(awal, awal + UKURAN_HALAMAN), total: daftar.length, ada: awal + UKURAN_HALAMAN < daftar.length };
}

// ---------------------------------------------------------------------------
// Aksi karyawan
// ---------------------------------------------------------------------------
function aksiAwal_(arg) {
  const r = aksiRiwayat_({ nik: arg.nik, ke: 0 });
  return { data: { riwayat: r.data }, cache: r.cache };
}

function aksiRiwayat_(arg) {
  const t = baca_('Pengajuan');
  const milik = t.baris.filter((r) => r[P.nik] === arg.nik).sort((a, b) => (a[P.diperbarui] < b[P.diperbarui] ? 1 : -1));
  return { data: halaman_(milik.map(ringkas_), arg.ke), cache: t.cache };
}

/** Satu panggilan: pengajuan + riwayat status + TAD. Kepemilikan disaring di server. */
function aksiDetail_(arg) {
  const p = baca_('Pengajuan');
  const baris = p.baris.find((r) => r[P.nomor] === arg.nomor && r[P.nik] === arg.nik);
  if (!baris) throw new Error('Pengajuan tidak ditemukan.');
  const rs = baca_('RiwayatStatus');
  const tad = baca_('PengajuanTAD');
  return {
    data: {
      pengajuan: ringkas_(baris),
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
  return denganKunci_(() => kirimPengajuan_(arg.nik, arg.form || {}, email, 'Dikirim'));
}

/**
 * Inti kirim pengajuan (dipakai juga simulasi). Di dalam kunci: nomor dari data cache,
 * appendRow, lalu cache diperbarui di tempat (tidak dibuang).
 */
function kirimPengajuan_(nik, f, email, status) {
  const p = baca_('Pengajuan');
  const nomor = 'KP-' + String(p.baris.length + 1).padStart(5, '0');
  const kini = new Date().toISOString();
  tambah_('Pengajuan', [[nomor, 'Klaim Biaya Perdin', nik, f.nama || '', f.noST || '', f.tujuan || '', f.berangkat || '', f.kembali || '', f.menginap ? 'Ya' : 'Tidak', f.jarak || '', f.moda || '', f.dinas ? 'Ya' : 'Tidak', 'C', status, kini, kini, (f.tad || []).length, '']], p.baris);
  tambah_('RiwayatStatus', [[nomor, status, email, kini, '']], baca_('RiwayatStatus').baris);
  if ((f.tad || []).length) tambah_('PengajuanTAD', f.tad.map((t) => [nomor, t[0], t[1], t[2], t[3]]));
  return { data: { nomor: nomor }, cache: p.cache };
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
// Aksi Admin
// ---------------------------------------------------------------------------
function aksiTugasku_(arg) {
  const t = baca_('Pengajuan');
  const cari = String(arg.cari || '').toLowerCase();
  const cocok = t.baris.filter((r) =>
    (arg.tab === 'TAD' ? r[P.jumlahTad] > 0 : true) &&
    (arg.status ? r[P.status] === arg.status : r[P.status] === 'Dikirim' || r[P.status] === 'Diproses') &&
    (arg.jenis ? r[P.jenis] === arg.jenis : true) &&
    (!cari || String(r[P.nomor]).toLowerCase().includes(cari) || String(r[P.nama]).toLowerCase().includes(cari) || String(r[P.noST]).toLowerCase().includes(cari)));
  cocok.sort((a, b) => (a[P.dibuat] < b[P.dibuat] ? 1 : -1));
  const hitungTad = t.baris.filter((r) => r[P.jumlahTad] > 0 && (r[P.status] === 'Dikirim' || r[P.status] === 'Diproses')).length;
  const hitungSemua = t.baris.filter((r) => r[P.status] === 'Dikirim' || r[P.status] === 'Diproses').length;
  return { data: { ...halaman_(cocok.map(ringkas_), arg.ke), hitung: { Karyawan: hitungSemua, TAD: hitungTad } }, cache: t.cache };
}

function aksiUbahStatus_(arg, email) {
  return denganKunci_(() => {
    const p = baca_('Pengajuan'); // posisi baris diketahui dari cache, tanpa membaca sheet
    const i = p.baris.findIndex((r) => r[P.nomor] === arg.nomor);
    if (i < 0) throw new Error('Pengajuan tidak ditemukan.');
    const kini = new Date().toISOString();
    const baris = p.baris[i];
    baris[P.status] = arg.status;
    baris[P.diperbarui] = kini;
    sheet_('Pengajuan').getRange(i + 2, 1, 1, baris.length).setValues([aman_(baris)]); // satu kali tulis
    simpanCache_('Pengajuan', p.baris);
    tambah_('RiwayatStatus', [[arg.nomor, arg.status, email, kini, arg.catatan || '']], baca_('RiwayatStatus').baris);
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
  return t[pengajuan.jarak === '>60' ? 'jauh' : 'dekat'];
}

/** Detail Admin + hitung SPPD dalam satu panggilan. */
function aksiDetailAdmin_(arg) {
  const p = baca_('Pengajuan');
  const baris = p.baris.find((r) => r[P.nomor] === arg.nomor);
  if (!baris) throw new Error('Pengajuan tidak ditemukan.');
  const rs = baca_('RiwayatStatus');
  const tad = baca_('PengajuanTAD');
  const tr = baca_('TarifSPPD');
  const tarif = {};
  tr.baris.forEach((r) => (tarif[r[0]] = { harian: r[1], bandara: r[2], dekat: r[3], jauh: r[4] }));
  const isi = { golongan: baris[P.golongan], menginap: baris[P.menginap], jarak: baris[P.jarak], berangkat: baris[P.berangkat], kembali: baris[P.kembali] };
  const daftarTad = tad.baris.filter((r) => r[0] === arg.nomor);
  return {
    data: {
      pengajuan: ringkas_(baris),
      riwayat: rs.baris.filter((r) => r[0] === arg.nomor).map((r) => ({ status: r[1], oleh: r[2], pada: r[3], catatan: r[4] })),
      hitung: {
        karyawan: hitungSppd_(isi, tarif),
        tad: daftarTad.map((r) => ({ nama: r[2], nominal: Math.round(hitungSppd_(Object.assign({}, isi, { golongan: 'TAD' }), tarif)) })),
      },
    },
    cache: [p.cache, rs.cache, tad.cache, tr.cache].join('/'),
  };
}

// ---------------------------------------------------------------------------
// Kinerja dan simulasi
// ---------------------------------------------------------------------------
function aksiCatatKinerja_(arg, email) {
  if (!arg.baris || !arg.baris.length) return { data: 0 };
  denganKunci_(() => tambah_('LogKinerja', arg.baris.map((b) => [new Date().toISOString(), b.aksi, b.totalMs, b.serverMs, b.perangkat, email, b.sukses ? 'Ya' : 'Tidak', b.cache || ''])));
  return { data: arg.baris.length };
}

/** Satu permintaan simulasi: baca Pengajuan + tulis satu baris log (di dalam kunci). */
/** Satu permintaan simulasi = satu kiriman pengajuan sungguhan (status "Simulasi", tidak masuk Tugasku). */
function aksiSimulasi_(arg, email) {
  const t0 = Date.now();
  const kunci = LockService.getScriptLock();
  kunci.waitLock(30000);
  const t1 = Date.now();
  let h;
  try {
    h = kirimPengajuan_('SIMULASI', { noST: 'SIM' }, email, 'Simulasi');
  } finally {
    kunci.releaseLock();
  }
  return { data: { tungguMs: t1 - t0, dalamKunciMs: Date.now() - t1, cache: h.cache } };
}

function aksiHasil_() {
  const baris = sheet_('LogKinerja').getDataRange().getValues().slice(1).filter((r) => r[1] !== 'simulasi-tulis');
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
