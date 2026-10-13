import { jamWita, konfig, LABEL_MODA, rentang, tanggal, type Isian } from "../pengajuan";

/**
 * Ringkasan isian sebagai pasangan <dt>/<dd>, dipakai Tinjau (K3), K4, dan detail Admin.
 * Isinya mengikuti bentuk form jenis layanan: perjalanan (klaim, SPPD) atau tiket.
 */
export default function ButirIsian({ jenis, isian: i }: { jenis: string; isian: Isian }) {
  const jadwal = (t: string, w: string) => (t ? [tanggal(t), jamWita(w)].filter(Boolean).join(" · ") : "-");
  if (konfig(jenis).form === "tiket") {
    return (
      <>
        <dt>Rute</dt>
        <dd>
          {i.kota_asal || "-"} → {i.kota_tujuan || "-"}
        </dd>
        <dt>Berangkat</dt>
        <dd>{jadwal(i.tgl_berangkat, i.waktu_berangkat)}</dd>
        <dt>Kembali</dt>
        <dd>{i.tgl_kembali ? jadwal(i.tgl_kembali, i.waktu_kembali) : "Sekali jalan"}</dd>
        <dt>Hotel</dt>
        <dd>{i.nama_hotel || "Tidak memesan hotel"}</dd>
        {i.catatan && (
          <>
            <dt>Catatan</dt>
            <dd>{i.catatan}</dd>
          </>
        )}
      </>
    );
  }
  return (
    <>
      <dt>Tujuan</dt>
      <dd>{i.kota_tujuan || "-"}</dd>
      <dt>Tanggal</dt>
      <dd>{rentang(i.tgl_berangkat, i.tgl_kembali) || "-"}</dd>
      <dt>Menginap</dt>
      <dd>{i.menginap === "ya" ? "Ya" : i.menginap === "tidak" ? `Tidak, ${i.jarak === "60" ? ">60 km" : ">30–60 km"}` : "-"}</dd>
      <dt>Transportasi</dt>
      <dd>
        {LABEL_MODA[i.moda_transportasi] ?? "-"}
        {i.moda_transportasi && (i.kendaraan_dinas === "ya" ? " · kendaraan dinas" : " · tanpa kendaraan dinas")}
      </dd>
    </>
  );
}
