/**
 * Penyiapan HCS-POC. Dijalankan pemilik (akun unit) dari editor Apps Script:
 * 1. siapkanPoc   → membuat 3 spreadsheet + folder dokumen privat
 * 2. isiDataDummy → mengisi data dummy volume 3 tahun
 * Fungsi ini terlihat oleh google.script.run, jadi diberi pengaman "hanya pemilik".
 */

function hanyaPemilik_() {
  const aktif = Session.getActiveUser().getEmail();
  if (!aktif || aktif !== Session.getEffectiveUser().getEmail()) throw new Error('Hanya pemilik proyek.');
}

const KOLOM_ = {
  Karyawan: ['nik_pendek', 'nama', 'prim_email', 'kode_job_grade', 'golongan', 'position_name', 'nama_unit_kerja', 'aktif'],
  TAD: ['id', 'nik', 'nama', 'vendor', 'unit_kerja', 'rekening_terenkripsi'],
  TarifSPPD: ['golongan', 'harian', 'bandara', 'dekat', 'jauh'],
  Pengajuan: ['nomor', 'jenis', 'pemilik_nik', 'nama', 'no_surat_tugas', 'tujuan', 'tgl_berangkat', 'tgl_kembali', 'menginap', 'jarak', 'moda', 'kendaraan_dinas', 'golongan', 'status', 'dibuat_pada', 'diperbarui_pada', 'jumlah_tad', 'nominal'],
  PengajuanTAD: ['pengajuan_nomor', 'tad_id', 'nama', 'nik', 'vendor'],
  RiwayatStatus: ['pengajuan_nomor', 'status', 'oleh', 'pada', 'catatan'],
  LogKinerja: ['pada', 'aksi', 'total_ms', 'server_ms', 'perangkat', 'penguji', 'sukses', 'cache'],
};

function siapkanPoc() {
  hanyaPemilik_();
  const props = PropertiesService.getScriptProperties();
  const induk = DriveApp.createFolder('HCS-POC (data dummy)');
  const grup = { Master: ['Karyawan', 'TAD', 'TarifSPPD'], Data: ['Pengajuan', 'PengajuanTAD', 'RiwayatStatus'], Log: ['LogKinerja'] };
  Object.keys(grup).forEach((nama) => {
    const ss = SpreadsheetApp.create('HCS_POC_' + nama);
    DriveApp.getFileById(ss.getId()).moveTo(induk);
    grup[nama].forEach((tabel, i) => {
      const sh = i === 0 ? ss.getSheets()[0].setName(tabel) : ss.insertSheet(tabel);
      sh.getRange('A:Z').setNumberFormat('@'); // semua teks: tanggal tidak diubah otomatis, rumus tidak berjalan
      sh.getRange(1, 1, 1, KOLOM_[tabel].length).setValues([KOLOM_[tabel]]);
      sh.setFrozenRows(1);
    });
    props.setProperty('SS_' + nama, ss.getId());
  });
  props.setProperty('FOLDER_DOKUMEN', induk.createFolder('Dokumen').getId());
  Logger.log('Siap. Folder: ' + induk.getName() + ' (tidak dibagikan).');
}

function isiDataDummy() {
  hanyaPemilik_();
  const acak = (n) => Math.floor(Math.random() * n);
  const pilih = (a) => a[acak(a.length)];
  const DEPAN = ['Andi', 'Bunga', 'Cahyo', 'Dewi', 'Eko', 'Fitri', 'Gilang', 'Hesti', 'Irfan', 'Joko', 'Kartika', 'Lukman', 'Maya', 'Nanda', 'Oki', 'Putri', 'Rizky', 'Sinta', 'Taufik', 'Wulan', 'Yoga', 'Zahra'];
  const BELAKANG = ['Pratama', 'Lestari', 'Nugroho', 'Anggraini', 'Saputra', 'Handayani', 'Ramadhan', 'Wulandari', 'Hakim', 'Susilo', 'Sari', 'Hidayat', 'Puspita', 'Kurniawan'];
  const UNIT = ['Kanwil IV Balikpapan', 'CP Balikpapan', 'CP Samarinda', 'CP Tarakan', 'CP Banjarmasin', 'CP Palangkaraya'];
  const nama = () => pilih(DEPAN) + ' ' + pilih(BELAKANG);

  // 873 karyawan: ±83% Gol C, ±16% Gol B, ±1% Gol A
  const karyawan = [];
  for (let i = 0; i < 873; i++) {
    const r = Math.random();
    const jg = r < 0.01 ? 14 + acak(3) : r < 0.17 ? 11 + acak(3) : 4 + acak(7);
    karyawan.push(['P9' + String(i + 1).padStart(4, '0'), nama(), 'karyawan' + (i + 1) + '@contoh.test', String(jg), jg >= 14 ? 'A' : jg >= 11 ? 'B' : 'C', pilih(['Staf', 'Manajer', 'Analis']), pilih(UNIT), 'Ya']);
  }

  // 1.346 TAD; sebagian nama sama persis dengan NIK berbeda
  const tad = [];
  for (let i = 0; i < 1346; i++) {
    const n = i % 50 === 0 && i > 0 ? tad[i - 1][2] : nama();
    tad.push(['T' + (i + 1), '64' + String(1e14 + acak(9e13)).slice(0, 14), n, pilih(['POJ', 'PKSS', 'EPS', 'INHOUSE']), pilih(UNIT), Utilities.getUuid().replace(/-/g, '')]);
  }

  const tarif = [['A', 520000, 250000, 350000, 380000], ['B', 410000, 250000, 250000, 270000], ['C', 300000, 250000, 180000, 200000], ['TAD', 210000, 175000, 126000, 140000]];

  // 10.000 pengajuan dalam 3 tahun; 40 pertama milik P90001 (untuk uji Riwayat)
  const JENIS = ['Klaim Biaya Perdin', 'Klaim Perdin Diklat', 'Permohonan SPPD', 'Pemesanan Tiket Pesawat'];
  const AWALAN = { 'Klaim Biaya Perdin': 'KP', 'Klaim Perdin Diklat': 'KD', 'Permohonan SPPD': 'SP', 'Pemesanan Tiket Pesawat': 'TP' };
  const kini = Date.now();
  const pengajuan = [], ptad = [], riwayat = [];
  for (let i = 0; i < 10000; i++) {
    const k = i < 40 ? karyawan[0] : pilih(karyawan);
    const jenis = pilih(JENIS);
    const nomor = AWALAN[jenis] + '-' + String(i + 1).padStart(5, '0');
    const umurHari = Math.floor(((10000 - i) / 10000) * 1095); // makin besar i makin baru
    const dibuat = new Date(kini - umurHari * 86400000);
    const berangkat = new Date(dibuat.getTime() + 3 * 86400000);
    const kembali = new Date(berangkat.getTime() + acak(5) * 86400000);
    const status = umurHari < 14 ? pilih(['Dikirim', 'Diproses']) : pilih(['Selesai', 'Selesai', 'Selesai', 'Ditolak', 'Perlu revisi']);
    const menginap = Math.random() < 0.7;
    const jumlahTad = Math.random() < 0.2 ? 1 + acak(3) : 0;
    const iso = (d) => d.toISOString();
    pengajuan.push([nomor, jenis, k[0], k[1], 'ST/' + String(acak(9999)).padStart(4, '0') + '/KW-IV/' + dibuat.getFullYear(), pilih(UNIT), iso(berangkat).slice(0, 10), iso(kembali).slice(0, 10), menginap ? 'Ya' : 'Tidak', menginap ? '' : pilih(['30-60', '>60']), pilih(['Pesawat', 'Darat', 'Kapal']), Math.random() < 0.2 ? 'Ya' : 'Tidak', k[4], status, iso(dibuat), iso(dibuat), jumlahTad, status === 'Selesai' ? 1000000 + acak(4000000) : '']);
    for (let t = 0; t < jumlahTad; t++) {
      const x = pilih(tad);
      ptad.push([nomor, x[0], x[2], x[1], x[3]]);
    }
    riwayat.push([nomor, 'Dikirim', k[2], iso(dibuat), '']);
    if (status !== 'Dikirim') riwayat.push([nomor, 'Diproses', 'admin.dummy@contoh.test', iso(new Date(dibuat.getTime() + 86400000)), '']);
    if (status === 'Selesai' || status === 'Ditolak' || status === 'Perlu revisi') {
      riwayat.push([nomor, status, 'admin.dummy@contoh.test', iso(new Date(dibuat.getTime() + 3 * 86400000)), status === 'Selesai' ? '' : 'Catatan dummy']);
      if (status === 'Selesai' && Math.random() < 0.5) riwayat.push([nomor, 'Catatan', 'admin.dummy@contoh.test', iso(new Date(dibuat.getTime() + 4 * 86400000)), 'Arsip dummy']);
    }
  }

  const isi = { Karyawan: karyawan, TAD: tad, TarifSPPD: tarif, Pengajuan: pengajuan, PengajuanTAD: ptad, RiwayatStatus: riwayat };
  Object.keys(isi).forEach((tabel) => {
    const sh = sheet_(tabel);
    if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
    tulisMulai_(sh, 2, isi[tabel]);
    lupakan_(tabel);
  });
  Logger.log('Data dummy: ' + Object.keys(isi).map((t) => t + ' ' + isi[t].length).join(', '));
}

/** WS-03: laporkan file POC yang dibagikan ke selain pemilik. */
function cekBerbagi() {
  hanyaPemilik_();
  const props = PropertiesService.getScriptProperties();
  const ids = ['SS_Master', 'SS_Data', 'SS_Log'].map((k) => props.getProperty(k));
  const temuan = [];
  ids.forEach((id) => {
    const f = DriveApp.getFileById(id);
    if (f.getEditors().length || f.getViewers().length || f.getSharingAccess() !== DriveApp.Access.PRIVATE) temuan.push(f.getName());
  });
  const dok = DriveApp.getFolderById(props.getProperty('FOLDER_DOKUMEN')).getFiles();
  while (dok.hasNext()) {
    const f = dok.next();
    if (f.getSharingAccess() !== DriveApp.Access.PRIVATE) temuan.push(f.getName());
  }
  Logger.log(temuan.length ? 'DIBAGIKAN: ' + temuan.join(', ') : 'Aman: 0 file dibagikan.');
}
