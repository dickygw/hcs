import { useEffect, useState } from "react";
import logo from "./aset/pegadaian-mark.png";
import styles from "./App.module.css";
import { panggil } from "./server";

type Status = { aplikasi: string; email: string; terdaftar: boolean };

/** Halaman awal Tahap 1: membuktikan tampilan, huruf Ronnia, dan pintu server tersambung. */
export default function App() {
  const [status, setStatus] = useState<Status | null>(null);
  const [galat, setGalat] = useState(false);

  useEffect(() => {
    panggil<Status>("status").then(setStatus, () => setGalat(true));
  }, []);

  return (
    <main className={styles.halaman}>
      <div className={styles.kartu}>
        <img src={logo} alt="Logo Pegadaian" className={styles.logo} />
        <span className={styles.wilayah}>Kanwil IV Balikpapan</span>
        <h1 className={styles.judul}>Human Capital System</h1>
        <p className={styles.keterangan}>Kerangka aplikasi siap. Fitur dibangun bertahap sesuai Build Plan.</p>
        <span className={galat ? `${styles.lencana} ${styles.terputus}` : styles.lencana} role="status">
          {galat ? "Server tidak dapat dihubungi" : status ? `Server terhubung · ${status.email}` : "Memeriksa server…"}
        </span>
      </div>
    </main>
  );
}
