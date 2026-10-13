import { useMemo, useState } from "react";
import { hitungOrang, type FungsiTarif, type Gol, type Hasil, type Masukan } from "../../../apps-script/src/hitung";
import s from "../komponen/data.module.css";
import ui from "../komponen/ui.module.css";
import { rupiah, tanggal, type Isian } from "../pengajuan";
import { panggil } from "../server";

export interface DataHitung {
  tanggalTarif: string;
  tarif: Record<string, number>;
  golonganTerkunci: string;
  simpanan: { golongan?: string; orang?: Record<string, Masukan> };
  orang: { kunci: string; nama: string; gol: string }[];
}

const ISIAN_ANGKA: { k: keyof Masukan; label: string; usulan?: boolean }[] = [
  { k: "qtyAsal", label: "Hari tarif unit kerja asal", usulan: true },
  { k: "qtyTujuan", label: "Hari tarif kota tujuan", usulan: true },
  { k: "jalan", label: "Kali jalan transportasi bandara/terminal", usulan: true },
  { k: "sewaBulan", label: "Bulan bantuan sewa rumah", usulan: true },
  { k: "hotel", label: "Hotel (at cost)" },
  { k: "tiket", label: "Tiket (at cost)" },
  { k: "penyesuaian", label: "Penyesuaian (+/−)" },
];

/**
 * Panel perhitungan SPPD di A3: angka dihitung langsung di layar Admin dengan mesin yang sama dengan server,
 * lalu server menghitung ulang saat disimpan (INPUT-03). Perubahan dari usulan sistem wajib beralasan.
 */
export default function PanelHitung(p: {
  nomor: string;
  isian: Isian;
  data: DataHitung;
  bisaUbah: boolean;
  bisaSelesai: boolean;
  alasanTidakSelesai: string;
  onSelesai: (kiriman: object) => Promise<void>;
  memuat: boolean;
}) {
  const [gol, setGol] = useState(p.data.golonganTerkunci || p.data.simpanan.golongan || "");
  const [masukan, setMasukan] = useState<Record<string, Masukan>>(p.data.simpanan.orang ?? {});
  const [pesan, setPesan] = useState("");
  const [galat, setGalat] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);

  const tarif: FungsiTarif = (g, k) => {
    const v = p.data.tarif[`${g}|${k}`];
    if (v === undefined) throw new Error(`Tarif ${k.replace(/_/g, " ")} golongan ${g} belum ada di Tarif SPPD.`);
    return v;
  };
  const hasil = useMemo(
    () =>
      p.data.orang.map((o) => {
        const g = (o.kunci === "karyawan" ? gol : o.gol) as Gol;
        if (!g) return { ...o, galat: "Pilih golongan karyawan." };
        try {
          return { ...o, hasil: hitungOrang(p.isian, g, tarif, masukan[o.kunci] ?? {}) };
        } catch (e) {
          return { ...o, galat: (e as Error).message };
        }
      }),
    [gol, masukan, p.isian, p.data],
  );
  const total = hasil.reduce((n, o) => n + (("hasil" in o && o.hasil?.total) || 0), 0);
  const kiriman = () => ({ nomor: p.nomor, golongan: p.data.golonganTerkunci ? undefined : gol, orang: masukan });
  const ubah = (kunci: string, k: keyof Masukan, v: string) =>
    setMasukan((m) => ({ ...m, [kunci]: { ...m[kunci], [k]: k === "alasan" ? v : v === "" ? undefined : Number(v) } }));

  async function simpan() {
    setMenyimpan(true);
    setGalat("");
    setPesan("");
    try {
      await panggil("simpanHitung", kiriman());
      setPesan("Perhitungan tersimpan.");
    } catch (e) {
      setGalat((e as Error).message);
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <section className={s.kartu}>
      <div className={s.kepalaKartu}>
        <span>Perhitungan SPPD</span>
        <span className={s.redup}>Tarif berlaku {tanggal(p.data.tanggalTarif)}</span>
      </div>
      <div className={s.isiKartu}>
        {!p.data.golonganTerkunci && (
          <label className={s.label}>
            Golongan karyawan
            <small>JG yang dikunci saat dikirim kosong (mis. Masa Persiapan Pensiun). Pilih golongan untuk perhitungan ini.</small>
            <select className={s.pilih} value={gol} disabled={!p.bisaUbah} onChange={(e) => setGol(e.target.value)}>
              <option value="">Pilih golongan</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </label>
        )}
        {hasil.map((o) => (
          <Orang key={o.kunci} nama={o.nama} gol={o.kunci === "karyawan" ? gol : "TAD"} hasil={"hasil" in o ? o.hasil : undefined} galat={"galat" in o ? o.galat : ""}
            masukan={masukan[o.kunci] ?? {}} bisaUbah={p.bisaUbah} onUbah={(k, v) => ubah(o.kunci, k, v)} />
        ))}
        <div className={s.totalHitung}>
          <span>Total disetujui</span>
          <strong>{rupiah(total)}</strong>
        </div>
        {galat && (
          <div className={s.galat} role="alert">
            {galat}
          </div>
        )}
        {pesan && <div className={s.info}>{pesan}</div>}
        {p.bisaUbah && (
          <div className={s.tombolBawah}>
            <button type="button" className={`${ui.tombol} ${ui.sekunder}`} disabled={menyimpan || p.memuat} onClick={() => void simpan()}>
              Simpan perhitungan
            </button>
            <button type="button" className={`${ui.tombol} ${ui.utama}`} disabled={!p.bisaSelesai || p.memuat} onClick={() => void p.onSelesai(kiriman())}>
              {p.memuat ? <span className={ui.putar} aria-hidden /> : "Selesai"}
            </button>
          </div>
        )}
        {p.bisaUbah && !p.bisaSelesai && <span className={s.pesanGalat}>{p.alasanTidakSelesai}</span>}
      </div>
    </section>
  );
}

function Orang(p: { nama: string; gol: string; hasil?: Hasil; galat: string; masukan: Masukan; bisaUbah: boolean; onUbah: (k: keyof Masukan, v: string) => void }) {
  const h = p.hasil;
  const baris = h
    ? [
        ["Uang harian unit kerja asal", `${rupiah(h.tarifAsal)} × ${h.qtyAsal}`, h.tarifAsal * h.qtyAsal],
        ["Uang harian kota tujuan", h.qtyTujuan ? `${rupiah(h.tarifTujuan)} × ${h.qtyTujuan}` : "-", h.tarifTujuan * h.qtyTujuan],
        ["Transportasi bandara/terminal", h.jalan ? `${rupiah(h.tarifJalan)} × ${h.jalan}` : "-", h.transport],
        ["Bantuan sewa rumah", h.sewaBulan ? `${h.sewaBulan} bulan` : "-", h.sewa],
        ["Hotel dan tiket (at cost)", "", h.hotel + h.tiket],
        ["Penyesuaian", "", h.penyesuaian],
      ]
    : [];
  return (
    <div className={s.orangHitung}>
      <div className={s.kepalaDetail}>
        <b>
          {p.nama} <span className={s.redup}>· {p.gol === "TAD" ? "TAD" : `Gol. ${p.gol || "-"}`}</span>
        </b>
        <strong>{h ? rupiah(h.total) : "-"}</strong>
      </div>
      {p.galat && <span className={s.pesanGalat}>{p.galat}</span>}
      {h && (
        <table className={s.tabel}>
          <tbody>
            {baris.map(([l, r, n]) => (
              <tr key={l as string}>
                <td>{l}</td>
                <td className={s.redup}>{r}</td>
                <td style={{ textAlign: "right" }}>{rupiah(n as number)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {p.bisaUbah && (
        <details>
          <summary className={s.tautan}>Ubah isian perhitungan</summary>
          <div className={s.isianHitung}>
            {ISIAN_ANGKA.map((f) => (
              <label key={f.k} className={s.label}>
                {f.label}
                {f.usulan && h && <small>Usulan sistem dipakai bila dikosongkan.</small>}
                <input className={s.isian} type="number" inputMode="numeric" step={1} value={(p.masukan[f.k] as number | undefined) ?? ""}
                  placeholder={h && f.usulan ? String(h[f.k as "qtyAsal"]) : "0"} onChange={(e) => p.onUbah(f.k, e.target.value)} />
              </label>
            ))}
            <label className={s.label} style={{ gridColumn: "1 / -1" }}>
              Alasan perubahan
              <small>Wajib bila jumlah hari, kali jalan, atau bulan sewa berbeda dari usulan, atau ada penyesuaian. Tercatat di log.</small>
              <input className={s.isian} maxLength={300} value={p.masukan.alasan ?? ""} onChange={(e) => p.onUbah("alasan", e.target.value)} />
            </label>
          </div>
        </details>
      )}
      {h?.diubah && h.alasan.length < 5 && <span className={s.pesanGalat}>Tulis alasan perubahan perhitungan untuk {p.nama}.</span>}
    </div>
  );
}
