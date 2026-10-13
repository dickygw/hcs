import { useCallback, useEffect, useRef, useState } from "react";
import s from "../komponen/data.module.css";
import ui from "../komponen/ui.module.css";
import { dariBase64, LAYANAN, namaDokumen, ukuran, waktuLengkap, waktuPendek, type Isian, type Status } from "../pengajuan";
import { panggil } from "../server";
import { unduh } from "../unggah";
import { buatXlsx } from "../xlsx";
import LembarCetak from "./LembarCetak";
import PanelHitung, { type DataHitung } from "./PanelHitung";
import ButirIsian from "./ButirIsian";
import { Lencana } from "./DetailPengajuan";

interface Baris {
  nomor: string;
  nama: string;
  pengaju?: string;
  vendor?: string;
  jenis: string;
  noSuratTugas: string;
  masuk: string;
  status: Status;
  penanda: string[];
}
interface Hasil {
  hitung: { karyawan: number; tad: number };
  total: number;
  baris: Baris[];
}
const AWAL = { tab: "karyawan", cari: "", status: "", jenis: "", rentang: "" };

/** A2 Tugasku: antrean pengajuan terkirim (Dikirim, Diproses). Daftar per halaman (PRD 9.1 #2). */
export default function Tugasku() {
  const [saring, setSaring] = useState(AWAL);
  const [cari, setCari] = useState("");
  const [data, setData] = useState<Hasil | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState("");
  const [buka, setBuka] = useState<string | null>(null);
  const [ekspor, setEkspor] = useState(false);
  const [cetak, setCetak] = useState<Cetakan | null>(null);

  const muat = useCallback(async (f: typeof AWAL, halaman: number) => {
    setMemuat(true);
    setGalat("");
    try {
      const h = await panggil<Hasil>("tugasku", { ...f, halaman });
      setData((lama) => (halaman && lama ? { ...h, baris: [...lama.baris, ...h.baris] } : h));
    } catch (e) {
      setGalat((e as Error).message);
    } finally {
      setMemuat(false);
    }
  }, []);
  useEffect(() => void muat(saring, 0), [muat, saring]);
  const ubah = (k: keyof typeof AWAL, v: string) => setSaring((f) => ({ ...f, [k]: v }));

  if (buka) {
    return (
      <DetailAdmin
        nomor={buka}
        onKembali={(berubah) => {
          setBuka(null);
          if (berubah) void muat(saring, 0);
        }}
      />
    );
  }

  const tad = saring.tab === "tad";
  return (
    <div className={s.halaman}>
      <div className={s.tab} role="tablist">
        {(["karyawan", "tad"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={saring.tab === t} onClick={() => ubah("tab", t)}>
            {t === "karyawan" ? "Karyawan" : "TAD"}
            <small>{data?.hitung[t] ?? "·"}</small>
          </button>
        ))}
      </div>
      <div className={s.saring}>
        <form role="search" onSubmit={(e) => (e.preventDefault(), ubah("cari", cari))}>
          <input className={s.cari} type="search" placeholder="Cari nomor, nama, atau No. Surat Tugas" value={cari} onChange={(e) => setCari(e.target.value)} onBlur={() => ubah("cari", cari)} aria-label="Cari" />
        </form>
        <select className={s.pilih} value={saring.status} onChange={(e) => ubah("status", e.target.value)} aria-label="Status">
          <option value="">Semua status</option>
          <option value="dikirim">Dikirim</option>
          <option value="diproses">Diproses</option>
        </select>
        <select className={s.pilih} value={saring.jenis} onChange={(e) => ubah("jenis", e.target.value)} aria-label="Jenis layanan">
          <option value="">Semua layanan</option>
          {LAYANAN.map((l) => (
            <option key={l.kode} value={l.kode}>
              {l.nama}
            </option>
          ))}
        </select>
        {/* Bawaan "Semua tanggal" agar antrean lama tidak tersembunyi. */}
        <select className={s.pilih} value={saring.rentang} onChange={(e) => ubah("rentang", e.target.value)} aria-label="Tanggal masuk">
          <option value="">Semua tanggal</option>
          <option value="hari_ini">Hari ini</option>
          <option value="7_hari">7 hari terakhir</option>
          <option value="30_hari">30 hari terakhir</option>
        </select>
      </div>
      <div className={s.alat}>
        <div className={s.kanan}>
          <button type="button" className={`${ui.tombol} ${ui.sekunder} ${ui.kecil}`} onClick={() => setEkspor(true)}>
            Ekspor daftar pembayaran
          </button>
        </div>
      </div>
      {ekspor && <DialogEkspor onTutup={() => setEkspor(false)} onCetak={setCetak} />}
      {cetak && <LembarCetak {...cetak} onSelesai={() => setCetak(null)} />}

      {galat && (
        <div className={s.galat} role="alert">
          {galat}{" "}
          <button type="button" className={s.tautan} onClick={() => void muat(saring, 0)}>
            Coba lagi
          </button>
        </div>
      )}

      <div className={`${s.kartu} ${s.hanyaLaptop}`}>
        <div className={s.gulir}>
          <table className={s.tabel}>
            <thead>
              <tr>
                <th>Nomor</th>
                <th>{tad ? "Nama TAD" : "Nama"}</th>
                {tad && <th>Diajukan oleh</th>}
                <th>Jenis layanan</th>
                <th>No. Surat Tugas</th>
                <th>Masuk</th>
                <th>Status</th>
                <th>Penanda</th>
              </tr>
            </thead>
            <tbody>
              {data?.baris.map((b, i) => (
                <tr key={b.nomor + i} className={s.barisKlik} onClick={() => setBuka(b.nomor)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setBuka(b.nomor)}>
                  <td className={s.nomorTautan}>{b.nomor}</td>
                  <td>{b.nama}</td>
                  {tad && <td className={s.redup}>{b.pengaju}</td>}
                  <td>{b.jenis}</td>
                  <td className={s.redup}>{b.noSuratTugas}</td>
                  <td className={s.redup}>{b.masuk ? waktuPendek(b.masuk) : "-"}</td>
                  <td>
                    <Lencana status={b.status} />
                  </td>
                  <td>
                    {b.penanda.map((x) => (
                      <span key={x} className={s.penanda}>
                        {x}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
              {!data && memuat && (
                <tr>
                  <td colSpan={8} className={s.redup}>
                    Memuat...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {data && !data.baris.length && <div className={s.bawahTabel}>Semua pengajuan sudah ditindaklanjuti.</div>}
        {data && data.baris.length > 0 && <Bawah data={data} memuat={memuat} onLagi={() => void muat(saring, Math.ceil(data.baris.length / 20))} />}
      </div>

      <div className={s.hanyaHp}>
        {data?.baris.map((b, i) => (
          <button key={b.nomor + i} type="button" className={s.kartuHp} onClick={() => setBuka(b.nomor)}>
            <div>
              <strong>{b.nama}</strong>
              <Lencana status={b.status} />
            </div>
            <span>
              {b.nomor} · {b.jenis}
            </span>
            <span>
              {b.noSuratTugas} · {b.masuk ? waktuPendek(b.masuk) : "-"}
            </span>
            {b.penanda.length > 0 && (
              <span>
                {b.penanda.map((x) => (
                  <span key={x} className={s.penanda}>
                    {x}
                  </span>
                ))}
              </span>
            )}
          </button>
        ))}
        {data && !data.baris.length && <p className={s.redup}>Semua pengajuan sudah ditindaklanjuti.</p>}
        {data && data.baris.length > 0 && <Bawah data={data} memuat={memuat} onLagi={() => void muat(saring, Math.ceil(data.baris.length / 20))} />}
      </div>
    </div>
  );
}

function Bawah(p: { data: Hasil; memuat: boolean; onLagi: () => void }) {
  return (
    <div className={s.bawahTabel}>
      <span>
        Menampilkan {p.data.baris.length} dari {p.data.total}
      </span>
      {p.data.baris.length < p.data.total && (
        <button type="button" className={`${ui.tombol} ${ui.sekunder} ${ui.kecil}`} disabled={p.memuat} onClick={p.onLagi}>
          {p.memuat ? "Memuat..." : "Muat lebih banyak"}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
interface DetailA {
  nomor: string;
  jenis: string;
  namaLayanan: string;
  labelSurat: string;
  status: Status;
  isian: Isian;
  pemohon: { nama: string; email: string; nik: string; jabatan: string; unit: string; jg: string; golongan: string };
  tad: { id: string; nama: string; nik: string; vendor: string; bank: string; rekening: string; terverifikasi: boolean }[];
  dokumen: { id: string; jenis: string; nama: string; tipe: string; ukuran: number }[];
  riwayat: { status: Status; pada: string; oleh: string; catatan: string }[];
  aksi: string[];
  hitung: DataHitung | null;
  umurDataKaryawan: { hari: number; warna: "hijau" | "kuning" | "merah" };
}

/**
 * A3 dasar: periksa isian dan dokumen, lalu Proses / Minta revisi / Tolak.
 * Panel perhitungan SPPD dan tombol Selesai ditambahkan di Tahap 9.
 */
function DetailAdmin(p: { nomor: string; onKembali: (berubah: boolean) => void }) {
  const [d, setD] = useState<DetailA | null>(null);
  const [galat, setGalat] = useState("");
  const [memuat, setMemuat] = useState(false);
  const [dialog, setDialog] = useState<"revisi" | "tolak" | null>(null);
  const [rekeningUntuk, setRekeningUntuk] = useState<{ id: string; nama: string } | null>(null);
  const [berubah, setBerubah] = useState(false);

  const muat = useCallback(() => {
    setGalat("");
    panggil<DetailA>("bukaPengajuanAdmin", { nomor: p.nomor })
      .then(setD)
      .catch((e: Error) => setGalat(e.message));
  }, [p.nomor]);
  useEffect(muat, [muat]);

  async function selesai(kiriman: object = { nomor: p.nomor }) {
    if (!d) return;
    setMemuat(true);
    setGalat("");
    try {
      await panggil("selesaikan", { ...kiriman, dari: d.status });
      setBerubah(true);
      muat();
    } catch (e) {
      setGalat((e as Error).message);
    } finally {
      setMemuat(false);
    }
  }

  async function aksi(nama: string, catatan = "") {
    if (!d) return;
    setMemuat(true);
    setGalat("");
    try {
      await panggil("ubahStatus", { nomor: d.nomor, aksi: nama, dari: d.status, catatan });
      setBerubah(true);
      setDialog(null);
      muat();
    } catch (e) {
      setGalat((e as Error).message);
    } finally {
      setMemuat(false);
    }
  }

  async function unduhDok(id: string) {
    try {
      const f = await panggil<{ nama: string; tipe: string; data: string }>("unduhDokumenAdmin", { id });
      unduh(f.nama || "dokumen", dariBase64(f.data), f.tipe);
    } catch (e) {
      setGalat((e as Error).message);
    }
  }

  return (
    <div className={s.halaman}>
      <span className={s.jejak}>
        <button type="button" className={s.tautan} onClick={() => p.onKembali(berubah)}>
          Tugasku
        </button>{" "}
        / {p.nomor}
      </span>
      {galat && (
        <div className={s.galat} role="alert">
          {galat}
        </div>
      )}
      {!d && !galat && <p className={s.redup}>Memuat...</p>}
      {d && (
        <>
          <div className={s.kepalaDetail}>
            <h2>
              {d.namaLayanan} · {d.nomor} <Lencana status={d.status} />
            </h2>
            <div className={s.kanan}>
              {d.aksi.includes("tolak") && (
                <button type="button" className={`${ui.tombol} ${ui.bahaya} ${ui.kecil}`} disabled={memuat} onClick={() => setDialog("tolak")}>
                  Tolak
                </button>
              )}
              {d.aksi.includes("revisi") && (
                <button type="button" className={`${ui.tombol} ${ui.sekunder} ${ui.kecil}`} disabled={memuat} onClick={() => setDialog("revisi")}>
                  Minta revisi
                </button>
              )}
              {d.aksi.includes("selesai") && !d.hitung && (
                <button type="button" className={`${ui.tombol} ${ui.utama} ${ui.kecil}`} disabled={memuat || d.tad.some((t) => !t.rekening)} onClick={() => void selesai()}>
                  Selesai
                </button>
              )}
              {d.aksi.includes("proses") && (
                <button type="button" className={`${ui.tombol} ${ui.utama} ${ui.kecil}`} disabled={memuat} onClick={() => void aksi("proses")}>
                  {memuat ? <span className={ui.putar} aria-hidden /> : "Proses"}
                </button>
              )}
            </div>
          </div>

          {d.umurDataKaryawan.warna !== "hijau" && d.hitung && (
            <div className={s.peringatan}>
              Data karyawan {d.umurDataKaryawan.hari < 0 ? "belum pernah disinkronkan" : `berumur ${d.umurDataKaryawan.hari} hari`}. Pastikan JG sesuai sebelum menyelesaikan.
            </div>
          )}

          <div className={s.duaKolom}>
            <div className={s.halaman}>
              <section className={s.kartu}>
                <div className={s.kepalaKartu}>Isian</div>
                <div className={s.isiKartu}>
                  <dl className={s.ringkas}>
                    <dt>{d.labelSurat}</dt>
                    <dd>{d.isian.no_surat_tugas}</dd>
                    <ButirIsian jenis={d.jenis} isian={d.isian} />
                  </dl>
                </div>
              </section>
              <section className={s.kartu}>
                <div className={s.kepalaKartu}>Dokumen ({d.dokumen.length})</div>
                <div className={s.isiKartu}>
                  {d.dokumen.map((f) => (
                    <div key={f.id} className={s.kepalaDetail}>
                      <span>
                        {namaDokumen(d.jenis, f.jenis)} · <span className={s.redup}>{f.nama} · {ukuran(f.ukuran)}</span>
                      </span>
                      <button type="button" className={s.tautan} onClick={() => void unduhDok(f.id)}>
                        Unduh
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <div className={s.halaman}>
              <section className={s.kartu}>
                <div className={s.kepalaKartu}>Pemohon</div>
                <div className={s.isiKartu}>
                  <dl className={s.ringkas}>
                    <dt>Nama</dt>
                    <dd>{d.pemohon.nama}</dd>
                    <dt>NIK</dt>
                    <dd>{d.pemohon.nik}</dd>
                    <dt>Jabatan</dt>
                    <dd>{d.pemohon.jabatan || "-"}</dd>
                    <dt>Unit</dt>
                    <dd>{d.pemohon.unit || "-"}</dd>
                    <dt>JG · golongan</dt>
                    <dd>
                      {d.pemohon.jg || "-"} · {d.pemohon.golongan || "perlu koreksi JG"}
                    </dd>
                  </dl>
                </div>
              </section>
              {d.tad.length > 0 && (
                <section className={s.kartu}>
                  <div className={s.kepalaKartu}>TAD ({d.tad.length})</div>
                  <div className={s.isiKartu}>
                    {d.tad.map((t) => (
                      <div key={t.id}>
                        <b>{t.nama}</b> · <span className={s.redup}>{[t.nik, t.vendor].filter(Boolean).join(" · ")}</span>
                        <div>
                          {t.rekening ? `${t.bank} ${t.rekening}` : <span className={s.penanda}>Rekening TAD kosong</span>}
                          {!t.terverifikasi && <span className={s.penanda}>TAD belum terdaftar</span>}
                          {!t.rekening && ["dikirim", "diproses"].includes(d.status) && (
                            <button type="button" className={s.tautan} onClick={() => setRekeningUntuk({ id: t.id, nama: t.nama })}>
                              Lengkapi rekening
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {d.hitung && (
                <PanelHitung
                  key={d.status}
                  nomor={d.nomor}
                  isian={d.isian}
                  data={d.hitung}
                  bisaUbah={d.status === "diproses"}
                  bisaSelesai={d.aksi.includes("selesai") && d.tad.every((t) => t.rekening)}
                  alasanTidakSelesai={d.status !== "diproses" ? "Klik Proses sebelum menghitung dan menyelesaikan." : "Lengkapi rekening TAD sebelum menyelesaikan pengajuan."}
                  onSelesai={selesai}
                  memuat={memuat}
                />
              )}
            </div>
          </div>

          <section className={s.kartu}>
            <div className={s.kepalaKartu}>Riwayat status</div>
            <div className={s.gulir}>
              <table className={s.tabel}>
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Status</th>
                    <th>Oleh</th>
                    <th>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {[...d.riwayat].reverse().map((r, i) => (
                    <tr key={i}>
                      <td className={s.redup} style={{ whiteSpace: "nowrap" }}>
                        {waktuLengkap(r.pada)}
                      </td>
                      <td>
                        <Lencana status={r.status} />
                      </td>
                      <td>{r.oleh}</td>
                      <td>{r.catatan || <span className={s.redup}>-</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      {rekeningUntuk && d && (
        <DialogRekening
          nomor={d.nomor}
          tad={rekeningUntuk}
          onTutup={(tersimpan) => {
            setRekeningUntuk(null);
            if (tersimpan) muat();
          }}
        />
      )}
      {dialog && d && <DialogCatatan jenis={dialog} nomor={d.nomor} memuat={memuat} galat={galat} onKirim={(c) => void aksi(dialog, c)} onTutup={() => setDialog(null)} />}
    </div>
  );
}

/** Dialog Minta revisi / Tolak: catatan wajib (diperiksa juga di server). */
function DialogCatatan(p: { jenis: "revisi" | "tolak"; nomor: string; memuat: boolean; galat: string; onKirim: (catatan: string) => void; onTutup: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [catatan, setCatatan] = useState("");
  useEffect(() => ref.current?.showModal(), []);
  const tolak = p.jenis === "tolak";
  return (
    <dialog ref={ref} className={s.dialog} onClose={p.onTutup} aria-labelledby="judul-catatan">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          p.onKirim(catatan);
        }}
      >
        <h2 id="judul-catatan">{tolak ? `Tolak pengajuan ${p.nomor}?` : `Minta revisi ${p.nomor}`}</h2>
        <label className={s.label}>
          {tolak ? "Alasan penolakan" : "Catatan untuk karyawan"}
          <small>Wajib diisi. Karyawan melihat teks ini di detail pengajuannya.</small>
          <textarea className={s.isian} rows={4} required minLength={5} maxLength={500} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
        </label>
        {p.galat && (
          <div className={s.galat} role="alert">
            {p.galat}
          </div>
        )}
        <div className={s.tombolBawah}>
          <button type="button" className={`${ui.tombol} ${ui.sekunder}`} disabled={p.memuat} onClick={() => ref.current?.close()}>
            Batal
          </button>
          <button type="submit" className={`${ui.tombol} ${tolak ? ui.bahaya : ui.utama}`} disabled={p.memuat}>
            {p.memuat ? <span className={ui.putar} aria-hidden /> : tolak ? "Tolak pengajuan" : "Minta revisi"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

/** Lengkapi rekening TAD (PRD 5.7): BRI 15 digit; disimpan terenkripsi, tampil tersamar. */
function DialogRekening(p: { nomor: string; tad: { id: string; nama: string }; onTutup: (tersimpan: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [bank, setBank] = useState("BRI");
  const [rekening, setRekening] = useState("");
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState("");
  useEffect(() => ref.current?.showModal(), []);
  return (
    <dialog ref={ref} className={s.dialog} onClose={() => p.onTutup(false)} aria-labelledby="judul-rekening">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setMemuat(true);
          setGalat("");
          try {
            await panggil("lengkapiRekeningTad", { nomor: p.nomor, tadId: p.tad.id, bank, rekening });
            p.onTutup(true);
          } catch (er) {
            setGalat((er as Error).message);
            setMemuat(false);
          }
        }}
      >
        <h2 id="judul-rekening">Lengkapi rekening {p.tad.nama}</h2>
        <label className={s.label}>
          Nama bank
          <input className={s.isian} value={bank} maxLength={20} onChange={(e) => setBank(e.target.value)} />
        </label>
        <label className={s.label}>
          Nomor rekening
          <small>Rekening BRI 15 digit. Disimpan terenkripsi dan tampil tersamar.</small>
          <input className={s.isian} inputMode="numeric" autoComplete="off" required value={rekening} onChange={(e) => setRekening(e.target.value.replace(/[^\d-]/g, ""))} />
        </label>
        {galat && (
          <div className={s.galat} role="alert">
            {galat}
          </div>
        )}
        <div className={s.tombolBawah}>
          <button type="button" className={`${ui.tombol} ${ui.sekunder}`} disabled={memuat} onClick={() => ref.current?.close()}>
            Batal
          </button>
          <button type="submit" className={`${ui.tombol} ${ui.utama}`} disabled={memuat}>
            {memuat ? <span className={ui.putar} aria-hidden /> : "Simpan rekening"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

/** Ekspor Daftar Pembayaran SPPD Lumpsum untuk CMS. Memuat rekening TAD lengkap → konfirmasi dan tercatat (Design Brief 6). */
interface Cetakan {
  kolom: string[];
  baris: string[][];
  total: number;
  dari: string;
  sampai: string;
}

function DialogEkspor(p: { onTutup: () => void; onCetak: (c: Cetakan) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const hariIni = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
  const [dari, setDari] = useState(hariIni.slice(0, 8) + "01");
  const [sampai, setSampai] = useState(hariIni);
  const [memuat, setMemuat] = useState(false);
  const format = useRef<"excel" | "pdf">("excel");
  const [galat, setGalat] = useState("");
  useEffect(() => ref.current?.showModal(), []);
  return (
    <dialog ref={ref} className={s.dialog} onClose={p.onTutup} aria-labelledby="judul-ekspor">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const pdf = format.current === "pdf";
          setMemuat(true);
          setGalat("");
          try {
            const h = await panggil<{ kolom: string[]; baris: string[][]; total: number }>("eksporPembayaran", { dari, sampai, format: pdf ? "pdf" : "excel" });
            if (pdf) p.onCetak({ ...h, dari, sampai });
            else unduh(`Daftar_Pembayaran_SPPD_${dari}_${sampai}.xlsx`, buatXlsx("Daftar Pembayaran SPPD", [h.kolom, ...h.baris]));
            ref.current?.close();
          } catch (er) {
            setGalat((er as Error).message);
          } finally {
            setMemuat(false);
          }
        }}
      >
        <h2 id="judul-ekspor">Ekspor daftar pembayaran</h2>
        <p className={s.redup}>Pengajuan berstatus Selesai, disetujui pada rentang tanggal berikut. Satu baris per karyawan dan per TAD.</p>
        <div className={s.saring} style={{ gridTemplateColumns: "1fr 1fr" }}>
          <label className={s.label}>
            Dari
            <input type="date" className={s.isian} value={dari} required onChange={(e) => setDari(e.target.value)} />
          </label>
          <label className={s.label}>
            Sampai
            <input type="date" className={s.isian} value={sampai} required onChange={(e) => setSampai(e.target.value)} />
          </label>
        </div>
        <div className={s.peringatan}>
          <b>Excel untuk CMS</b> memuat nomor rekening TAD dan akan tercatat di log. <b>PDF untuk persetujuan atasan</b> tanpa nomor rekening; pilih
          "Simpan sebagai PDF" di jendela cetak.
        </div>
        {galat && (
          <div className={s.galat} role="alert">
            {galat}
          </div>
        )}
        <div className={s.tombolBawah}>
          <button type="button" className={`${ui.tombol} ${ui.sekunder}`} disabled={memuat} onClick={() => ref.current?.close()}>
            Batal
          </button>
          <button type="submit" className={`${ui.tombol} ${ui.sekunder}`} disabled={memuat} onClick={() => (format.current = "pdf")}>
            Cetak PDF untuk persetujuan
          </button>
          <button type="submit" className={`${ui.tombol} ${ui.utama}`} disabled={memuat} onClick={() => (format.current = "excel")}>
            {memuat ? <span className={ui.putar} aria-hidden /> : "Unduh Excel untuk CMS"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
