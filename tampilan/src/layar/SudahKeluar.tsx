import styles from "../komponen/masuk.module.css";
import ui from "../komponen/ui.module.css";

/** Setelah Keluar (AUTH-06). Akun Google tetap masuk di browser, jadi pengguna diingatkan di perangkat bersama. */
export default function SudahKeluar(p: { onMasuk: () => void; memuat: boolean }) {
  return (
    <main className={styles.halaman}>
      <div className={`${styles.isi} ${styles.isiTengah}`}>
        <span className={styles.wilayah}>Kanwil IV Balikpapan</span>
        <h1 className={styles.judulU2}>Anda sudah keluar dari HCS</h1>
        <p className={styles.tagline}>
          Akun Google Anda masih masuk di browser ini. Jika memakai perangkat bersama, keluar juga dari akun Google.
        </p>
        <div className={styles.tombolBawah}>
          <button type="button" className={`${ui.tombol} ${ui.utama} ${ui.penuh}`} onClick={p.onMasuk} disabled={p.memuat}>
            {p.memuat && <span className={ui.putar} aria-hidden />}
            Masuk kembali
          </button>
          <a href="https://accounts.google.com/Logout" target="_top" className={`${ui.tombol} ${ui.sekunder} ${ui.penuh}`}>
            Keluar dari akun Google
          </a>
        </div>
      </div>
    </main>
  );
}
