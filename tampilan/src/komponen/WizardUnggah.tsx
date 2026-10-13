import { useState, type ReactNode } from "react";
import { panggil } from "../server";
import { bacaFile, type HasilBaca } from "../unggah";
import s from "./data.module.css";
import ui from "./ui.module.css";

export interface Masalah {
  baris: number;
  nik: string;
  nama: string;
  alasan: string;
}
export interface Kartu {
  label: string;
  sub: string;
  kolom: string[];
  baris: string[][];
}
interface Terapan {
  baru: number;
  berubah: number;
  nonaktif: number;
  dilewati?: number;
}

const LANGKAH = ["1 Unggah file", "2 Pemeriksaan", "3 Ringkasan perubahan", "4 Terapkan"];
const BATAS_RINCIAN = 200;

/**
 * Wizard unggah 4 langkah (mockup A5): Unggah file → Pemeriksaan → Ringkasan perubahan → Terapkan.
 * File dibaca di perangkat; hanya kolom yang dikenal dikirim ke server. Server memeriksa ulang dan
 * menghitung perubahan; tidak ada yang tersimpan sebelum Terapkan.
 */
export default function WizardUnggah<R extends { jumlahBaris: number; masalah: Masalah[] }>(p: {
  jejak: string;
  kolom: Record<string, string>;
  rutePratinjau: string;
  ruteTerapkan: string;
  keterangan: ReactNode;
  /** true: baris bermasalah dilewati (TAD). false: file harus diperbaiki dulu (HCMS). */
  bolehLewati: boolean;
  kartu: (r: R) => Kartu[];
  kartuAwal: number;
  labelTerapkan: string;
  pesanSelesai: (h: Terapan) => string;
  onTutup: (diterapkan: boolean) => void;
}) {
  const [langkah, setLangkah] = useState(0);
  const [file, setFile] = useState<Extract<HasilBaca, { ok: true }> | null>(null);
  const [galatFile, setGalatFile] = useState<Extract<HasilBaca, { ok: false }> | null>(null);
  const [ringkasan, setRingkasan] = useState<R | null>(null);
  const [terbuka, setTerbuka] = useState(p.kartuAwal);
  const [selesai, setSelesai] = useState<Terapan | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState("");

  const kiriman = () => file && { namaFile: file.namaFile, awal: file.awal, baris: file.baris };

  async function pilih(f: File | undefined) {
    if (!f) return;
    setGalat("");
    setGalatFile(null);
    setMemuat(true);
    try {
      const h = await bacaFile(f, p.kolom);
      if (!h.ok) {
        setGalatFile(h);
        setLangkah(1);
        return;
      }
      setFile(h);
      const r = await panggil<R>(p.rutePratinjau, { namaFile: h.namaFile, awal: h.awal, baris: h.baris });
      setRingkasan(r);
      setTerbuka(p.kartuAwal);
      setLangkah(r.masalah.length ? 1 : 2);
    } catch (e) {
      setGalat((e as Error).message);
    } finally {
      setMemuat(false);
    }
  }

  async function terapkan() {
    setGalat("");
    setMemuat(true);
    try {
      setSelesai(await panggil<Terapan>(p.ruteTerapkan, kiriman()));
      setLangkah(3);
    } catch (e) {
      setGalat((e as Error).message);
    } finally {
      setMemuat(false);
    }
  }

  const ulang = () => {
    setLangkah(0);
    setFile(null);
    setGalatFile(null);
    setRingkasan(null);
    setGalat("");
  };
  const kartu = ringkasan ? p.kartu(ringkasan) : [];
  const rincian = kartu[terbuka];

  return (
    <div className={s.halaman}>
      <span className={s.jejak}>{p.jejak}</span>
      <div className={s.langkah} aria-label={`Langkah ${langkah + 1} dari 4`}>
        {LANGKAH.map((l, i) => (
          <div key={l} className={`${i <= langkah ? s.selesai : ""} ${i === langkah ? s.kini : ""}`} aria-current={i === langkah ? "step" : undefined}>
            {l}
          </div>
        ))}
      </div>

      {galat && (
        <div className={s.galat} role="alert">
          {galat}
        </div>
      )}

      {langkah === 0 && (
        <>
          <label className={s.pilihFile}>
            <span>{memuat ? "Membaca dan memeriksa file..." : "Pilih file .xlsx dari laptop Anda."}</span>
            <span className={`${ui.tombol} ${ui.utama}`} aria-disabled={memuat}>
              {memuat ? <span className={ui.putar} aria-hidden /> : "Pilih file"}
            </span>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={memuat}
              onChange={(e) => {
                void pilih(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <div className={s.info}>{p.keterangan}</div>
          <div className={s.tombolBawah}>
            <button type="button" className={`${ui.tombol} ${ui.sekunder}`} onClick={() => p.onTutup(false)}>
              Batal
            </button>
          </div>
        </>
      )}

      {langkah === 1 && galatFile && (
        <>
          <div className={s.galat} role="alert">
            <b>{galatFile.namaFile}</b>: {galatFile.pesan}
            {galatFile.hilang.length > 0 && (
              <ul className={s.daftarGalat}>
                {galatFile.hilang.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            )}
          </div>
          <div className={s.tombolBawah}>
            <button type="button" className={`${ui.tombol} ${ui.utama}`} onClick={ulang}>
              Pilih file lain
            </button>
          </div>
        </>
      )}

      {langkah === 1 && ringkasan && file && (
        <>
          <div className={s.info}>
            File <b>{file.namaFile}</b> · {ringkasan.jumlahBaris} baris · {ringkasan.masalah.length} baris bermasalah.{" "}
            {p.bolehLewati ? "Baris bermasalah tidak akan diimpor." : "Perbaiki baris berikut di file, lalu unggah ulang."}
          </div>
          <TabelRincian
            judul={`Baris bermasalah (${ringkasan.masalah.length})`}
            kolom={["Baris", "NIK", "Nama", "Masalah"]}
            baris={ringkasan.masalah.map((m) => [String(m.baris), m.nik, m.nama, m.alasan])}
          />
          <div className={s.tombolBawah}>
            <button type="button" className={`${ui.tombol} ${p.bolehLewati ? ui.sekunder : ui.utama}`} onClick={ulang}>
              Pilih file lain
            </button>
            {p.bolehLewati && (
              <button type="button" className={`${ui.tombol} ${ui.utama}`} onClick={() => setLangkah(2)}>
                Lanjut tanpa baris bermasalah
              </button>
            )}
          </div>
        </>
      )}

      {langkah === 2 && ringkasan && file && (
        <>
          <div className={s.info}>
            File <b>{file.namaFile}</b> · {ringkasan.jumlahBaris} baris · {Object.keys(p.kolom).length} dari {file.jumlahKolom} kolom dipakai, kolom lain tidak dikirim
            {ringkasan.masalah.length > 0 && ` · ${ringkasan.masalah.length} baris bermasalah dilewati`}
          </div>
          <div className={s.ringkasan}>
            {kartu.map((k, i) => (
              <button key={k.label} type="button" className={`${s.angka} ${i === terbuka ? s.angkaAktif : ""}`} aria-expanded={i === terbuka} onClick={() => setTerbuka(i === terbuka ? -1 : i)}>
                <strong>{k.baris.length}</strong>
                <span>{k.label}</span>
                <small>{k.sub}</small>
              </button>
            ))}
          </div>
          {rincian && rincian.baris.length > 0 && <TabelRincian judul={`${rincian.label} (${rincian.baris.length})`} kolom={rincian.kolom} baris={rincian.baris} onTutup={() => setTerbuka(-1)} />}
          <div className={s.tombolBawah}>
            <button type="button" className={`${ui.tombol} ${ui.sekunder}`} onClick={ulang} disabled={memuat}>
              Kembali
            </button>
            <button type="button" className={`${ui.tombol} ${ui.utama}`} onClick={() => void terapkan()} disabled={memuat}>
              {memuat ? <span className={ui.putar} aria-hidden /> : p.labelTerapkan}
            </button>
          </div>
        </>
      )}

      {langkah === 3 && selesai && (
        <>
          <div className={s.info} role="status">
            {p.pesanSelesai(selesai)}
          </div>
          <div className={s.tombolBawah}>
            <button type="button" className={`${ui.tombol} ${ui.utama}`} onClick={() => p.onTutup(true)}>
              Kembali ke daftar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function TabelRincian(p: { judul: string; kolom: string[]; baris: string[][]; onTutup?: () => void }) {
  return (
    <div className={s.kartu}>
      <div className={s.kepalaKartu}>
        <span>{p.judul}</span>
        {p.onTutup && (
          <button type="button" className={s.tautan} onClick={p.onTutup}>
            Tutup rincian
          </button>
        )}
      </div>
      <div className={s.gulir}>
        <table className={s.tabel}>
          <thead>
            <tr>
              {p.kolom.map((k) => (
                <th key={k}>{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {p.baris.slice(0, BATAS_RINCIAN).map((b, i) => (
              <tr key={i}>
                {b.map((v, j) => (
                  <td key={j} className={j === 0 ? s.redup : undefined}>
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {p.baris.length > BATAS_RINCIAN && <div className={s.bawahTabel}>Menampilkan {BATAS_RINCIAN} baris pertama dari {p.baris.length}.</div>}
    </div>
  );
}
