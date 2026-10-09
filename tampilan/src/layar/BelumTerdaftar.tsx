import styles from "../komponen/masuk.module.css";
import ui from "../komponen/ui.module.css";

/** U2 Akun belum terdaftar. */
export default function BelumTerdaftar(p: { email: string; kontak: string; urlAplikasi: string; onKeluar: () => void }) {
  const pilihAkun = `https://accounts.google.com/AccountChooser?continue=${encodeURIComponent(p.urlAplikasi)}`;
  return (
    <main className={styles.halaman}>
      <div className={`${styles.isi} ${styles.isiTengah}`}>
        <div className={styles.ikonAkun} aria-hidden>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </svg>
        </div>
        <h1 className={styles.judulU2}>Akun Anda belum terdaftar di HCS</h1>
        <p className={styles.tagline}>Silakan hubungi Admin SDM agar akun Anda didaftarkan.</p>
        <div className={styles.kotakInfo}>
          <div className={styles.baris}>
            <span>Email yang dipakai</span>
            <strong>{p.email}</strong>
          </div>
          <div className={styles.baris}>
            <span>Admin SDM Kanwil IV</span>
            <strong>{p.kontak}</strong>
          </div>
        </div>
        <div className={styles.tombolBawah}>
          <a href={pilihAkun} target="_top" className={`${ui.tombol} ${ui.utama} ${ui.penuh}`}>
            Coba akun lain
          </a>
          <button type="button" className={`${ui.tombol} ${ui.sekunder} ${ui.penuh}`} onClick={p.onKeluar}>
            Keluar
          </button>
        </div>
      </div>
    </main>
  );
}
