import styles from "./Sesi.module.css";
import ui from "./ui.module.css";

/** U3 Sesi berakhir. */
export default function SesiBerakhir(p: { onMasuk: () => void; memuat: boolean }) {
  return (
    <div className={styles.latar}>
      <div className={styles.lembar} role="alertdialog" aria-modal="true" aria-labelledby="judul-sesi">
        <div className={styles.pegangan} />
        <h2 id="judul-sesi" className={styles.judul}>
          Sesi Anda berakhir
        </h2>
        <p className={styles.teks}>Tidak ada aktivitas selama 15 menit. Draf form yang belum terkirim tetap tersimpan.</p>
        <button type="button" className={`${ui.tombol} ${ui.utama} ${ui.penuh}`} onClick={p.onMasuk} disabled={p.memuat} autoFocus>
          {p.memuat && <span className={ui.putar} aria-hidden />}
          Masuk kembali
        </button>
      </div>
    </div>
  );
}
