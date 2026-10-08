import styles from "./page.module.css";
import StatusServer from "./StatusServer";

export default function Beranda() {
  return (
    <main className={styles.halaman}>
      <div className={styles.kartu}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/pegadaian-mark.png" alt="Logo Pegadaian" className={styles.logo} />
        <span className={styles.wilayah}>Kanwil IV Balikpapan</span>
        <h1 className={styles.judul}>Human Capital System</h1>
        <p className={styles.keterangan}>Kerangka aplikasi siap. Fitur dibangun bertahap sesuai Build Plan.</p>
        <StatusServer />
      </div>
    </main>
  );
}
