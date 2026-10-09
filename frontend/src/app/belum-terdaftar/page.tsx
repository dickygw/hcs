import type { Metadata } from "next";
import ui from "@/components/ui.module.css";
import styles from "../masuk.module.css";

export const metadata: Metadata = { title: "Akun belum terdaftar · HCS" };

// Kotak masuk bersama Admin SDM; hanya sebagai kontak, tidak dipakai untuk masuk sebagai Admin.
const KONTAK_ADMIN_SDM = "manohc.balikpapan@pegadaian.co.id";

/** U2 Akun belum terdaftar. */
export default async function BelumTerdaftar({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;

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
          {email && (
            <div className={styles.baris}>
              <span>Email yang dipakai</span>
              <strong>{email.slice(0, 254)}</strong>
            </div>
          )}
          <div className={styles.baris}>
            <span>Admin SDM Kanwil IV</span>
            <strong>{KONTAK_ADMIN_SDM}</strong>
          </div>
        </div>
        <div className={styles.tombolBawah}>
          <a href="/api/auth/google" className={`${ui.tombol} ${ui.utama} ${ui.penuh}`}>
            Coba akun lain
          </a>
          <a href="/masuk" className={`${ui.tombol} ${ui.sekunder} ${ui.penuh}`}>
            Keluar
          </a>
        </div>
      </div>
    </main>
  );
}
