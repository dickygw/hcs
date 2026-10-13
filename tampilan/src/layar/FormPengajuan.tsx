import { useEffect, useRef, useState, type ReactNode } from "react";
import { dokumenWajib, periksaIsian } from "../../../apps-script/src/pengajuan";
import s from "../komponen/pengajuan.module.css";
import ui from "../komponen/ui.module.css";
import { inisial } from "../jenis";
import { jam, kalimat, konfig, LABEL_MODA, LAYANAN, namaDokumen, rentang, siapkanFile, ukuran, type Detail, type Dokumen, type Isian, type Tad } from "../pengajuan";
import { panggil } from "../server";

const KOSONG: Isian = { no_surat_tugas: "", kota_tujuan: "", tgl_berangkat: "", tgl_kembali: "", menginap: "", jarak: "", moda_transportasi: "", kendaraan_dinas: "" };
/** Isian yang diperiksa per langkah saat Lanjut ditekan. */
const ISIAN_LANGKAH: (keyof Isian)[][] = [["no_surat_tugas"], ["kota_tujuan", "tgl_berangkat", "tgl_kembali", "menginap", "jarak"], ["moda_transportasi", "kendaraan_dinas"], [], [], []];

type TadDraf = Tad & { baru?: { nama: string; nik: string; vendor: string } };
interface HasilDraf {
  nomor: string;
  tersimpanPada: string;
  tad: Tad[];
  terpakai: Record<string, string>;
}

/** K2 Pilih jenis layanan. */
export function PilihLayanan(p: { onPilih: (kode: string) => void; onTutup: () => void }) {
  const [pilihan, setPilihan] = useState("klaim_perdin");
  return (
    <div className={s.layar}>
      <header className={s.atas}>
        <div className={s.barisJudul}>
          <div>
            <button type="button" className={s.ikon} onClick={p.onTutup} aria-label="Kembali">
              <Ikon d="M15 18l-6-6 6-6" />
            </button>
            <h1 className={s.judulBesar}>Ajukan</h1>
          </div>
        </div>
      </header>
      <div className={`${s.badan} ${s.badanAbu}`}>
        <h2 className={s.judulLayar} style={{ fontSize: 18, padding: "4px 4px 4px" }}>
          Pilih jenis layanan
        </h2>
        {LAYANAN.map((l) => (
          <button key={l.kode} type="button" className={s.layanan} aria-pressed={pilihan === l.kode} disabled={!l.aktif} onClick={() => setPilihan(l.kode)}>
            <div className={s.awalan}>{l.awalan}</div>
            <div>
              <strong>{l.nama}</strong>
              <span>{l.aktif ? l.info : "Segera tersedia."}</span>
            </div>
          </button>
        ))}
      </div>
      <div className={s.bawah}>
        <button type="button" className={`${ui.tombol} ${ui.utama} ${ui.penuh}`} onClick={() => p.onPilih(pilihan)}>
          Lanjut
        </button>
      </div>
    </div>
  );
}

/**
 * K3 Form pengajuan 6 langkah, 5 bila tanpa Bukti (Design Brief 5.1). Draf disimpan di server setiap pindah langkah
 * (tidak di browser, WEB-06). Karyawan hanya mengisi fakta; tidak ada tarif atau hitungan (PRD 5.8).
 */
export default function FormPengajuan(p: { jenis: string; awal?: Detail; onTutup: (perluMuatUlang: boolean) => void; onTerkirim: (nomor: string, noSuratTugas: string) => void }) {
  const layanan = LAYANAN.find((l) => l.kode === p.jenis)!;
  const { surat, singkat, bukti } = konfig(p.jenis); // Surat Tugas atau Surat Pemanggilan (PRD 5.1)
  const urutan = bukti ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 5]; // langkah Bukti dilewati bila tidak relevan
  const [langkah, setLangkah] = useState(0);
  const [isian, setIsian] = useState<Isian>(p.awal?.isian ?? KOSONG);
  const [disentuh, setDisentuh] = useState<Set<string>>(new Set());
  const [dokumen, setDokumen] = useState<Dokumen[]>(p.awal?.dokumen ?? []);
  const [tad, setTad] = useState<TadDraf[]>(p.awal?.tad ?? []);
  const [terpakai, setTerpakai] = useState<Record<string, string>>(p.awal?.terpakai ?? {});
  const [pernyataan, setPernyataan] = useState(false);
  const [tersimpan, setTersimpan] = useState("");
  const [galat, setGalat] = useState("");
  const [mengirim, setMengirim] = useState(false);
  const nomor = useRef(p.awal?.nomor ?? "");
  const antrean = useRef<Promise<unknown>>(Promise.resolve());
  const atas = useRef<HTMLDivElement>(null);

  const galatIsian = periksaIsian(isian, p.jenis);
  const ubah = (k: keyof Isian, v: string) => setIsian((x) => ({ ...x, [k]: v, ...(k === "menginap" && v === "ya" ? { jarak: "" } : {}) }));
  const tinggalkan = (k: string) => setDisentuh((d) => new Set(d).add(k));
  const pesan = (k: keyof Isian) => (disentuh.has(k) ? galatIsian[k] : undefined);

  /** Simpan draf berurutan; panggilan pertama membuat nomor pengajuan. */
  function simpan(denganTad = false): Promise<HasilDraf> {
    const kirim = () =>
      panggil<HasilDraf>("simpanDraf", {
        nomor: nomor.current,
        jenis: p.jenis,
        isian,
        ...(denganTad ? { tad: tad.map((t) => (t.baru ? { baru: t.baru } : { id: t.id })) } : {}),
      }).then((h) => {
        nomor.current = h.nomor;
        setTersimpan(h.tersimpanPada);
        setTerpakai(h.terpakai);
        if (denganTad) setTad(h.tad);
        return h;
      });
    const j = antrean.current.then(kirim, kirim);
    antrean.current = j.catch(() => undefined);
    return j;
  }

  const pastikanNomor = () => (nomor.current ? Promise.resolve(nomor.current) : simpan().then((h) => h.nomor));

  function ke(i: number) {
    setGalat("");
    setLangkah(i);
    atas.current?.scrollIntoView({ block: "start" });
  }

  async function lanjut() {
    const salah = ISIAN_LANGKAH[langkah]!.filter((k) => galatIsian[k]);
    if (salah.length) {
      setDisentuh((d) => new Set([...d, ...salah]));
      document.getElementById("isian-" + salah[0])?.focus();
      return;
    }
    if (langkah === 0 && !dokumen.some((d) => d.jenis === "surat_tugas")) return setGalat(`Unggah dokumen ${surat}.`);
    if (langkah === 4) {
      const kurang = dokumenWajib(isian, p.jenis).filter((j) => !dokumen.some((d) => d.jenis === j));
      if (kurang.length) return setGalat("Unggah " + kurang.map((j) => namaDokumen(p.jenis, j).toLowerCase()).join(", ") + ".");
    }
    // Tampilan optimistis (PRD 9.1 #6): pindah langkah dulu, draf disimpan di latar belakang.
    ke(urutan[urutan.indexOf(langkah) + 1]!);
    simpan(langkah === 3).catch((e: Error) => setGalat(e.message + " Isian Anda tetap di layar; coba lanjut lagi."));
  }

  async function kirim() {
    if (tad.length && !pernyataan) return setGalat(`Centang pernyataan bahwa data TAD sesuai dengan ${surat}.`);
    setMengirim(true);
    setGalat("");
    try {
      await simpan(true);
      await panggil("kirimPengajuan", { nomor: nomor.current, pernyataanTad: pernyataan });
      p.onTerkirim(nomor.current, isian.no_surat_tugas);
    } catch (e) {
      setGalat((e as Error).message);
      setMengirim(false);
    }
  }

  const terakhir = langkah === 5;
  const ke_ = urutan.indexOf(langkah);
  return (
    <div className={s.layar}>
      <header className={s.atas} ref={atas}>
        <div className={s.barisJudul}>
          <div>
            <button type="button" className={s.ikon} onClick={() => p.onTutup(!!nomor.current)} aria-label="Tutup, draf tetap tersimpan">
              <Ikon d="M6 6l12 12M18 6L6 18" />
            </button>
            <h1 className={s.judulLayar}>{layanan.nama}</h1>
          </div>
          <span className={s.keLangkah}>
            {ke_ + 1} dari {urutan.length}
          </span>
        </div>
        <div className={s.progres} aria-hidden>
          {urutan.map((l, i) => (
            <span key={l} className={i <= ke_ ? s.penuh : undefined} />
          ))}
        </div>
      </header>

      <div className={s.badan}>
        {galat && (
          <div className={s.galat} role="alert">
            <strong>{galat}</strong>
          </div>
        )}

        {langkah === 0 && (
          <>
            <h2 className={s.judulLangkah}>{kalimat(surat)}</h2>
            <Kolom id="no_surat_tugas" label={`Nomor ${surat}`} bantuan={`Tertera di kanan atas ${surat}.`} galat={pesan("no_surat_tugas")}>
              <input id="isian-no_surat_tugas" className={s.isian} value={isian.no_surat_tugas} maxLength={60} autoComplete="off" aria-invalid={!!pesan("no_surat_tugas")}
                onChange={(e) => ubah("no_surat_tugas", e.target.value)} onBlur={() => tinggalkan("no_surat_tugas")} />
            </Kolom>
            <Unggah jenis="surat_tugas" label={`Dokumen ${surat}`} dokumen={dokumen} setDokumen={setDokumen} nomor={pastikanNomor} />
          </>
        )}

        {langkah === 1 && (
          <>
            <h2 className={s.judulLangkah}>Perjalanan</h2>
            <Kolom id="kota_tujuan" label="Kota atau unit tujuan" galat={pesan("kota_tujuan")}>
              <input id="isian-kota_tujuan" className={s.isian} value={isian.kota_tujuan} maxLength={100} aria-invalid={!!pesan("kota_tujuan")}
                onChange={(e) => ubah("kota_tujuan", e.target.value)} onBlur={() => tinggalkan("kota_tujuan")} />
            </Kolom>
            <div className={s.duaKolom}>
              <Kolom id="tgl_berangkat" label="Berangkat" galat={pesan("tgl_berangkat")}>
                <input id="isian-tgl_berangkat" type="date" className={s.isian} value={isian.tgl_berangkat} aria-invalid={!!pesan("tgl_berangkat")}
                  onChange={(e) => ubah("tgl_berangkat", e.target.value)} onBlur={() => tinggalkan("tgl_berangkat")} />
              </Kolom>
              <Kolom id="tgl_kembali" label="Kembali" galat={pesan("tgl_kembali")}>
                <input id="isian-tgl_kembali" type="date" className={s.isian} value={isian.tgl_kembali} min={isian.tgl_berangkat || undefined} aria-invalid={!!pesan("tgl_kembali")}
                  onChange={(e) => ubah("tgl_kembali", e.target.value)} onBlur={() => tinggalkan("tgl_kembali")} />
              </Kolom>
            </div>
            <Pilihan id="menginap" label="Menginap?" galat={pesan("menginap")} nilai={isian.menginap} opsi={[["ya", "Ya, menginap"], ["tidak", "Tidak"]]} onPilih={(v) => (ubah("menginap", v), tinggalkan("menginap"))} />
            <Pilihan id="jarak" label="Jarak (hanya jika tidak menginap)" galat={pesan("jarak")} nilai={isian.jarak} nonaktif={isian.menginap !== "tidak"}
              opsi={[["30_60", ">30–60 km"], ["60", ">60 km"]]} onPilih={(v) => (ubah("jarak", v), tinggalkan("jarak"))} />
          </>
        )}

        {langkah === 2 && (
          <>
            <h2 className={s.judulLangkah}>Transportasi</h2>
            <Pilihan id="moda_transportasi" label="Moda transportasi" galat={pesan("moda_transportasi")} nilai={isian.moda_transportasi}
              opsi={Object.entries(LABEL_MODA)} onPilih={(v) => (ubah("moda_transportasi", v), tinggalkan("moda_transportasi"))} />
            <Pilihan id="kendaraan_dinas" label="Menggunakan kendaraan dinas?" galat={pesan("kendaraan_dinas")} nilai={isian.kendaraan_dinas}
              opsi={[["ya", "Ya"], ["tidak", "Tidak"]]} onPilih={(v) => (ubah("kendaraan_dinas", v), tinggalkan("kendaraan_dinas"))} />
          </>
        )}

        {langkah === 3 && <BagianTad surat={surat} tad={tad} setTad={setTad} terpakai={terpakai} />}

        {langkah === 4 && (
          <>
            <h2 className={s.judulLangkah}>Bukti perjalanan</h2>
            {isian.menginap === "ya" && <Unggah jenis="kuitansi_hotel" label="Kuitansi hotel" dokumen={dokumen} setDokumen={setDokumen} nomor={pastikanNomor} />}
            <Unggah jenis="kuitansi_transportasi" label={isian.kendaraan_dinas === "ya" ? "Kuitansi transportasi (opsional)" : "Kuitansi transportasi"} dokumen={dokumen} setDokumen={setDokumen} nomor={pastikanNomor} />
            <Unggah jenis="formulir" label="Formulir pengajuan" dokumen={dokumen} setDokumen={setDokumen} nomor={pastikanNomor} />
          </>
        )}

        {langkah === 5 && (
          <>
            <h2 className={s.judulLangkah}>Tinjau dan kirim</h2>
            <Blok judul={`${kalimat(surat)} dan perjalanan`} onUbah={() => ke(0)}>
              <dl className={s.ringkas}>
                <dt>{singkat}</dt>
                <dd>{isian.no_surat_tugas}</dd>
                <dt>Tujuan</dt>
                <dd>{isian.kota_tujuan}</dd>
                <dt>Tanggal</dt>
                <dd>
                  {rentang(isian.tgl_berangkat, isian.tgl_kembali)} · {isian.menginap === "ya" ? "menginap" : `tidak menginap, ${isian.jarak === "60" ? ">60 km" : ">30–60 km"}`}
                </dd>
                <dt>Transportasi</dt>
                <dd>
                  {LABEL_MODA[isian.moda_transportasi]} · {isian.kendaraan_dinas === "ya" ? "kendaraan dinas" : "tanpa kendaraan dinas"}
                </dd>
              </dl>
            </Blok>
            <Blok judul={`Dokumen (${dokumen.length})`} onUbah={() => ke(bukti ? 4 : 0)}>
              <span className={s.teksKecil}>{dokumen.map((d) => namaDokumen(p.jenis, d.jenis)).join(", ")}</span>
            </Blok>
            <Blok judul={`TAD dalam ${surat} ini (${tad.length})`} onUbah={() => ke(3)}>
              <span className={s.teksKecil}>{tad.length ? tad.map((t) => [t.nama, t.vendor].filter(Boolean).join(" · ")).join("; ") : "Tidak ada TAD."}</span>
              {tad.length > 0 && (
                <label className={s.centang}>
                  <input type="checkbox" checked={pernyataan} onChange={(e) => setPernyataan(e.target.checked)} />
                  Data TAD yang saya tambahkan sesuai dengan {surat}.
                </label>
              )}
            </Blok>
          </>
        )}
      </div>

      <div className={s.bawah}>
        <div className={s.draf} aria-live="polite">
          {tersimpan ? `Draf tersimpan otomatis · ${jam(tersimpan)}` : "Draf tersimpan otomatis saat Anda lanjut"}
        </div>
        <div className={s.duaTombol}>
          <button type="button" className={`${ui.tombol} ${ui.sekunder}`} disabled={mengirim} onClick={() => (ke_ ? ke(urutan[ke_ - 1]!) : p.onTutup(!!nomor.current))}>
            Kembali
          </button>
          <button type="button" className={`${ui.tombol} ${ui.utama}`} disabled={mengirim} onClick={() => void (terakhir ? kirim() : lanjut())}>
            {mengirim ? <span className={ui.putar} aria-hidden /> : terakhir ? "Kirim pengajuan" : "Lanjut"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function Ikon({ d }: { d: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

function Kolom(p: { id: string; label: string; bantuan?: string; galat?: string; children: ReactNode }) {
  return (
    <div className={s.kolom}>
      <label className={s.label} htmlFor={"isian-" + p.id}>
        {p.label}
      </label>
      {p.children}
      {p.galat ? (
        <span className={s.pesanGalat} role="alert">
          {p.galat}
        </span>
      ) : (
        p.bantuan && <span className={s.bantuan}>{p.bantuan}</span>
      )}
    </div>
  );
}

function Pilihan(p: { id: string; label: string; nilai: string; opsi: [string, string][]; onPilih: (v: string) => void; galat?: string; nonaktif?: boolean }) {
  return (
    <div className={s.kolom} role="group" aria-labelledby={"label-" + p.id}>
      <span className={s.label} id={"label-" + p.id}>
        {p.label}
      </span>
      <div className={s.pilihan}>
        {p.opsi.map(([v, l], i) => (
          <button key={v} id={i === 0 ? "isian-" + p.id : undefined} type="button" aria-pressed={p.nilai === v} disabled={p.nonaktif} onClick={() => p.onPilih(v)}>
            {l}
          </button>
        ))}
      </div>
      {p.galat && !p.nonaktif && (
        <span className={s.pesanGalat} role="alert">
          {p.galat}
        </span>
      )}
    </div>
  );
}

function Blok(p: { judul: string; onUbah: () => void; children: ReactNode }) {
  return (
    <section className={s.blok}>
      <div className={s.kepalaBlok}>
        <span>{p.judul}</span>
        <button type="button" className={s.tautan} onClick={p.onUbah}>
          Ubah
        </button>
      </div>
      {p.children}
    </section>
  );
}

/** Area unggah satu jenis dokumen (FILE-01..05 diperiksa di server). */
function Unggah(p: { jenis: string; label: string; dokumen: Dokumen[]; setDokumen: (f: (d: Dokumen[]) => Dokumen[]) => void; nomor: () => Promise<string> }) {
  const [proses, setProses] = useState<{ nama: string; ukuran: number } | null>(null);
  const [galat, setGalat] = useState("");
  const milik = p.dokumen.filter((d) => d.jenis === p.jenis);

  async function pilih(file: File | undefined) {
    if (!file) return;
    setGalat("");
    const siap = await siapkanFile(file);
    if ("galat" in siap) return setGalat(siap.galat);
    setProses({ nama: file.name, ukuran: siap.ukuran });
    try {
      const d = await panggil<Dokumen>("unggahDokumen", { nomor: await p.nomor(), jenis: p.jenis, nama: file.name, data: siap.data });
      p.setDokumen((x) => [...x, d]);
    } catch (e) {
      setGalat((e as Error).message);
    } finally {
      setProses(null);
    }
  }

  async function hapus(d: Dokumen) {
    p.setDokumen((x) => x.filter((y) => y.id !== d.id));
    try {
      await panggil("hapusDokumen", { id: d.id });
    } catch (e) {
      p.setDokumen((x) => [...x, d]);
      setGalat((e as Error).message);
    }
  }

  return (
    <div className={s.kolom}>
      <span className={s.label}>{p.label}</span>
      {milik.map((d) => (
        <div key={d.id} className={s.file}>
          <span className={`${s.jenisFile} ${d.tipe === "application/pdf" ? "" : s.jenisGambar}`}>{d.tipe === "application/pdf" ? "PDF" : d.tipe === "image/png" ? "PNG" : "JPG"}</span>
          <div className={s.infoFile}>
            <div className={s.namaFile}>
              <span>{d.nama}</span>
            </div>
            <span className={s.keterangan}>Terunggah · {ukuran(d.ukuran)}</span>
          </div>
          <button type="button" className={s.ikon} onClick={() => void hapus(d)} aria-label={`Hapus ${d.nama}`}>
            <Ikon d="M6 6l12 12M18 6L6 18" />
          </button>
        </div>
      ))}
      {proses && (
        <div className={s.file} aria-live="polite">
          <span className={s.jenisFile}>...</span>
          <div className={s.infoFile}>
            <div className={s.namaFile}>
              <span>{proses.nama}</span>
              <span>{ukuran(proses.ukuran)}</span>
            </div>
            <div className={s.batang}>
              <span />
            </div>
            <span className={s.keterangan}>Mengunggah...</span>
          </div>
        </div>
      )}
      {!proses && (
        <label className={s.areaUnggah}>
          <span style={{ color: "var(--pgd-green)" }}>
            <Ikon d="M12 16V4M7 9l5-5 5 5M4 20h16" />
          </span>
          <strong>{milik.length ? "Tambah file lain" : "Pilih file atau ambil foto"}</strong>
          <span>PDF, JPG, atau PNG · maks. 5 MB</span>
          <input
            id={"isian-" + p.jenis}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(e) => {
              void pilih(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      )}
      {galat && (
        <span className={s.pesanGalat} role="alert">
          {galat}
        </span>
      )}
    </div>
  );
}

/** Langkah 4: TAD dalam Surat Tugas ini (PRD 5.7). Saran dicari di perangkat; tanpa rekening. */
function BagianTad(p: { surat: string; tad: TadDraf[]; setTad: (f: (t: TadDraf[]) => TadDraf[]) => void; terpakai: Record<string, string> }) {
  const [semua, setSemua] = useState<Tad[] | null>(null);
  const [galatMuat, setGalatMuat] = useState("");
  const [cari, setCari] = useState("");
  const [baru, setBaru] = useState<{ nama: string; nik: string; vendor: string } | null>(null);
  const [galatBaru, setGalatBaru] = useState("");

  useEffect(() => {
    panggil<Tad[]>("saranTad")
      .then(setSemua)
      .catch((e: Error) => setGalatMuat(e.message));
  }, []);

  const sudah = new Set(p.tad.map((t) => t.id));
  const kata = cari.trim().toLowerCase();
  const saran = kata.length >= 3 && semua ? semua.filter((t) => !sudah.has(t.id) && t.nama.toLowerCase().includes(kata)).slice(0, 8) : [];
  // Nama mirip: ada kata (≥ 3 huruf) yang diawali kata lain, mis. "Andini" dan "Andi".
  const kataDari = (x: string) => x.toLowerCase().split(/\s+/).filter((k) => k.length >= 3);
  const kataBaru = baru ? kataDari(baru.nama) : [];
  const mirip = kataBaru.length && semua
    ? semua.filter((t) => kataDari(t.nama).some((a) => kataBaru.some((b) => a.startsWith(b) || b.startsWith(a)))).slice(0, 5)
    : [];

  const tambah = (t: TadDraf) => {
    p.setTad((x) => [...x, t]);
    setCari("");
  };

  return (
    <>
      <div className={s.kolom}>
        <span className={s.labelTad}>Bagian TAD</span>
        <h2 className={s.judulLangkah}>TAD dalam {p.surat} ini</h2>
        <span className={s.teksKecil}>Tambahkan hanya TAD yang namanya tercantum di {p.surat}. Lewati langkah ini bila tidak ada TAD.</span>
      </div>
      <div className={s.kotakTad}>
        {!baru ? (
          <>
            <input className={s.isian} type="search" placeholder="Ketik minimal 3 huruf nama TAD" value={cari} onChange={(e) => setCari(e.target.value)} aria-label="Cari nama TAD" disabled={!semua} />
            {!semua && !galatMuat && <span className={s.teksKecil}>Memuat daftar TAD...</span>}
            {galatMuat && <span className={s.pesanGalat}>{galatMuat}</span>}
            {saran.length > 0 && (
              <div className={s.saran}>
                {saran.map((t) => (
                  <button key={t.id} type="button" disabled={!!p.terpakai[t.id]} onClick={() => tambah(t)}>
                    <strong>{t.nama}</strong>
                    {p.terpakai[t.id] ? <span className={s.terpakai}>TAD ini sudah diajukan dalam pengajuan {p.terpakai[t.id]}.</span> : <span>{[t.nik, t.vendor, t.unit].filter(Boolean).join(" · ")}</span>}
                  </button>
                ))}
              </div>
            )}
            {kata.length >= 3 && semua && !saran.length && <span className={s.teksKecil}>Tidak ada TAD dengan nama itu.</span>}
            <span className={s.teksKecil}>
              Tidak ditemukan?{" "}
              <button type="button" className={s.tautan} onClick={() => setBaru({ nama: cari, nik: "", vendor: "" })}>
                TAD belum terdaftar
              </button>
            </span>
          </>
        ) : (
          <>
            <strong className={s.judulLayar}>TAD belum terdaftar</strong>
            <div className={s.kolom}>
              <label className={s.label} htmlFor="tad-nama">
                Nama TAD
              </label>
              <input id="tad-nama" className={s.isian} value={baru.nama} maxLength={100} onChange={(e) => setBaru({ ...baru, nama: e.target.value })} />
            </div>
            <div className={s.kolom}>
              <label className={s.label} htmlFor="tad-nik">
                NIK <small>(opsional)</small>
              </label>
              <input id="tad-nik" className={s.isian} inputMode="numeric" maxLength={16} value={baru.nik} onChange={(e) => setBaru({ ...baru, nik: e.target.value.replace(/\D/g, "") })} />
            </div>
            <div className={s.kolom}>
              <label className={s.label} htmlFor="tad-vendor">
                Vendor <small>(opsional)</small>
              </label>
              <input id="tad-vendor" className={s.isian} maxLength={40} value={baru.vendor} onChange={(e) => setBaru({ ...baru, vendor: e.target.value })} />
            </div>
            {mirip.length > 0 && (
              <div className={s.kolom}>
                <span className={s.label}>Apakah yang Anda maksud salah satu ini?</span>
                <div className={s.saran}>
                  {mirip.map((t) => (
                    <button key={t.id} type="button" disabled={sudah.has(t.id) || !!p.terpakai[t.id]} onClick={() => (tambah(t), setBaru(null))}>
                      <strong>{t.nama}</strong>
                      <span>{[t.nik, t.vendor, t.unit].filter(Boolean).join(" · ")}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {galatBaru && <span className={s.pesanGalat}>{galatBaru}</span>}
            <div className={s.duaTombol}>
              <button type="button" className={`${ui.tombol} ${ui.sekunder} ${ui.kecil}`} onClick={() => (setBaru(null), setGalatBaru(""))}>
                Batal
              </button>
              <button
                type="button"
                className={`${ui.tombol} ${ui.utama} ${ui.kecil}`}
                onClick={() => {
                  if (baru.nama.trim().length < 3) return setGalatBaru("Isi nama TAD minimal 3 huruf.");
                  if (baru.nik && baru.nik.length !== 16) return setGalatBaru("NIK TAD harus 16 digit atau dikosongkan.");
                  tambah({ id: "baru-" + Date.now(), nama: baru.nama.trim(), nik: baru.nik, vendor: baru.vendor.trim(), unit: "", belumTerverifikasi: true, baru });
                  setBaru(null);
                  setGalatBaru("");
                }}
              >
                Tambahkan TAD
              </button>
            </div>
          </>
        )}
      </div>
      {p.tad.length > 0 && (
        <div className={s.kolom}>
          <span className={s.label}>Ditambahkan ({p.tad.length})</span>
          {p.tad.map((t) => (
            <div key={t.id} className={s.orangTad}>
              <span className={s.inisial} aria-hidden>
                {inisial(t.nama)}
              </span>
              <div>
                <strong>{t.nama}</strong>
                <span>{[t.nik, t.vendor, t.unit].filter(Boolean).join(" · ") || "Data belum lengkap"}{t.belumTerverifikasi ? " · belum terverifikasi" : ""}</span>
              </div>
              <button type="button" className={s.ikon} onClick={() => p.setTad((x) => x.filter((y) => y.id !== t.id))} aria-label={`Hapus ${t.nama}`}>
                <Ikon d="M6 6l12 12M18 6L6 18" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
