import { useEffect } from "react";
import { createPortal } from "react-dom";
import { tanggal } from "../pengajuan";

const UANG = ["Uang Harian Unit Kerja Asal", "Uang Harian Kota Tujuan", "Jumlah Uang Harian", "Transportasi", "Bantuan Sewa Rumah", "Hotel dan Tiket (at cost)", "Penyesuaian", "JUMLAH"];
const angka = (v: string) => (v && !isNaN(Number(v)) ? Number(v).toLocaleString("id-ID") : v);

/**
 * Lembar Daftar Pembayaran SPPD untuk lampiran persetujuan atasan. Dicetak lewat dialog cetak browser
 * ("Simpan sebagai PDF"), A4 mendatar. Tanpa nomor rekening (lihat eksporPembayaran format "pdf").
 * Dipasang langsung di <body>; saat mencetak hanya lembar ini yang tampil (global.css: .lembar-cetak).
 */
export default function LembarCetak(p: { kolom: string[]; baris: string[][]; total: number; dari: string; sampai: string; onSelesai: () => void }) {
  useEffect(() => {
    const selesai = () => p.onSelesai();
    window.addEventListener("afterprint", selesai);
    const t = setTimeout(() => window.print(), 100);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", selesai);
    };
  }, []);
  const uang = new Set(UANG.map((k) => p.kolom.indexOf(k)));
  const iJumlah = p.kolom.indexOf("JUMLAH");
  return createPortal(
    <div className="lembar-cetak">
      <h1>DAFTAR PEMBAYARAN SPPD LUMPSUM</h1>
      <p>
        PT Pegadaian Kantor Wilayah IV Balikpapan · Disetujui {tanggal(p.dari)} s.d. {tanggal(p.sampai)}
      </p>
      <table>
        <thead>
          <tr>
            {p.kolom.map((k) => (
              <th key={k}>{k}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {p.baris.map((b, i) => (
            <tr key={i}>
              {b.map((v, j) => (
                <td key={j} className={uang.has(j) ? "angka" : undefined}>
                  {uang.has(j) ? angka(v) : v}
                </td>
              ))}
            </tr>
          ))}
          <tr className="total">
            <td colSpan={iJumlah}>Total</td>
            <td className="angka">{p.total.toLocaleString("id-ID")}</td>
            <td colSpan={p.kolom.length - iJumlah - 1} />
          </tr>
        </tbody>
      </table>
      <div className="tanda-tangan">
        <div>
          <span>Dibuat oleh,</span>
          <span>Admin SDM</span>
          <span className="garis" />
        </div>
        <div>
          <span>Disetujui oleh,</span>
          <span>&nbsp;</span>
          <span className="garis" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
