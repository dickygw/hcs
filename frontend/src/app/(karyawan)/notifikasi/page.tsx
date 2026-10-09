import ui from "@/components/ui.module.css";
import styles from "../karyawan.module.css";

/** K5 Notifikasi. Isi dibangun pada Tahap 12. */
export default function Notifikasi() {
  return (
    <>
      <header className={styles.kepala}>
        <h1 className={ui.judul}>Notifikasi</h1>
      </header>
      <section className={styles.kosong}>
        <p className={styles.teksKosong}>Belum ada notifikasi.</p>
      </section>
    </>
  );
}
