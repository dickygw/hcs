import { useCallback, useEffect, useState, type ReactNode } from "react";
import { panggil } from "../server";
import s from "./data.module.css";
import ui from "./ui.module.css";

export interface Riwayat {
  pada: string;
  oleh: string;
  namaFile: string;
  baru: number;
  berubah: number;
  nonaktif: number;
}
interface Hasil<T> {
  total: number;
  baris: T[];
  umur: { hari: number; warna: "hijau" | "kuning" | "merah" };
  riwayat: Riwayat[];
}
export interface Kolom<T> {
  judul: string;
  isi: (b: T) => ReactNode;
  redup?: boolean;
}

export const tanggal = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";

/**
 * Daftar data master per halaman (PRD 9.1 #2), dipakai A5 dan A6.
 * Data hanya di memori komponen (WEB-06); hilang saat keluar atau layar terkunci.
 */
export default function DaftarMaster<T extends { nik: string; aktif: boolean }>(p: {
  rute: string;
  kolom: Kolom<T>[];
  umurLabel: (hari: number, terakhir?: Riwayat) => ReactNode;
  /** Warna hijau/kuning/merah hanya untuk data karyawan (PRD 6.2). */
  berwarna?: boolean;
  tombol: ReactNode;
  versi: number; // naik setelah unggahan diterapkan → muat ulang
}) {
  const [cari, setCari] = useState("");
  const [kueri, setKueri] = useState(""); // kata cari yang sedang ditampilkan
  const [data, setData] = useState<Hasil<T> | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState("");

  const muat = useCallback(
    async (kataCari: string, halaman: number) => {
      setMemuat(true);
      setGalat("");
      setKueri(kataCari);
      try {
        const h = await panggil<Hasil<T>>(p.rute, { cari: kataCari, halaman });
        setData((lama) => (halaman && lama ? { ...h, baris: [...lama.baris, ...h.baris] } : h));
      } catch (e) {
        setGalat((e as Error).message);
      } finally {
        setMemuat(false);
      }
    },
    [p.rute],
  );

  useEffect(() => {
    void muat("", 0);
    setCari("");
  }, [muat, p.versi]);

  const halamanBerikut = data ? Math.ceil(data.baris.length / 20) : 0;
  return (
    <>
      {data && (
        <div className={`${s.umur} ${p.berwarna && data.umur.warna !== "hijau" ? s[data.umur.warna] : ""}`}>
          <span>{p.umurLabel(data.umur.hari, data.riwayat[0])}</span>
        </div>
      )}
      <div className={s.alat}>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            void muat(cari, 0);
          }}
        >
          <input className={s.cari} type="search" placeholder="Cari NIK, nama, atau unit" value={cari} onChange={(e) => setCari(e.target.value)} aria-label="Cari" />
        </form>
        <div className={s.kanan}>{p.tombol}</div>
      </div>
      {galat && (
        <div className={s.galat} role="alert">
          {galat}{" "}
          <button type="button" className={s.tautan} onClick={() => void muat(cari, 0)}>
            Coba lagi
          </button>
        </div>
      )}
      <div className={s.kartu}>
        <div className={s.gulir}>
          <table className={s.tabel}>
            <thead>
              <tr>
                {p.kolom.map((k) => (
                  <th key={k.judul}>{k.judul}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.baris.map((b) => (
                <tr key={b.nik} className={b.aktif ? undefined : s.baris_nonaktif}>
                  {p.kolom.map((k) => (
                    <td key={k.judul} className={k.redup ? s.redup : undefined}>
                      {k.isi(b)}
                    </td>
                  ))}
                </tr>
              ))}
              {!data && memuat &&
                Array.from({ length: 5 }, (_, i) => (
                  <tr key={i}>
                    <td colSpan={p.kolom.length} className={s.redup}>
                      Memuat...
                    </td>
                  </tr>
                ))}
              {data && !data.baris.length && (
                <tr>
                  <td colSpan={p.kolom.length} className={s.redup}>
                    {kueri ? "Tidak ada data yang cocok." : "Belum ada data."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {data && (
          <div className={s.bawahTabel}>
            <span>
              Menampilkan {data.baris.length} dari {data.total}
            </span>
            {data.baris.length < data.total && (
              <button type="button" className={`${ui.tombol} ${ui.sekunder} ${ui.kecil}`} disabled={memuat} onClick={() => void muat(kueri, halamanBerikut)}>
                {memuat ? "Memuat..." : "Muat lebih banyak"}
              </button>
            )}
          </div>
        )}
      </div>
      {data && data.riwayat.length > 0 && (
        <div className={s.kartu}>
          <div className={s.kepalaKartu}>Riwayat unggahan</div>
          <div className={s.gulir}>
            <table className={s.tabel}>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Oleh</th>
                  <th>File</th>
                  <th>Baru</th>
                  <th>Berubah</th>
                  <th>Nonaktif</th>
                </tr>
              </thead>
              <tbody>
                {data.riwayat.map((r) => (
                  <tr key={r.pada}>
                    <td>{new Date(r.pada).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className={s.redup}>{r.oleh}</td>
                    <td className={s.redup}>{r.namaFile}</td>
                    <td>{r.baru}</td>
                    <td>{r.berubah}</td>
                    <td>{r.nonaktif}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
