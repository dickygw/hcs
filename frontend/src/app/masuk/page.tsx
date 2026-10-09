import type { Metadata } from "next";
import styles from "../masuk.module.css";
import TombolMasuk from "./TombolMasuk";

export const metadata: Metadata = { title: "Masuk · HCS" };

const GALAT: Record<string, string> = {
  domain: "Gunakan akun @pegadaian.co.id untuk masuk.",
  gagal: "Proses masuk gagal. Silakan coba lagi.",
  "terlalu-sering": "Terlalu banyak percobaan masuk. Tunggu 15 menit lalu coba lagi.",
};

/** U1 Masuk, termasuk kondisi error. */
export default async function Masuk({ searchParams }: { searchParams: Promise<{ galat?: string; email?: string }> }) {
  const { galat, email } = await searchParams;
  const pesan = galat ? GALAT[galat] : undefined;

  return (
    <main className={styles.halaman}>
      {!pesan && <div className={styles.pola} aria-hidden />}
      <div className={styles.isi}>
        <div className={styles.kepala}>
          <span className={styles.wilayah}>Kanwil IV Balikpapan</span>
          <h1 className={styles.namaAplikasi}>Human Capital System</h1>
          {!pesan && <p className={styles.tagline}>Ajukan klaim perjalanan dinas, SPPD, dan tiket pesawat dari satu tempat.</p>}
        </div>

        {pesan && (
          <div className={styles.galat} role="alert">
            <span className={styles.ikonGalat} aria-hidden>
              !
            </span>
            <div className={styles.isiGalat}>
              <strong>{pesan}</strong>
              {galat === "domain" && email && <span>Akun yang dipakai: {email.slice(0, 254)}</span>}
            </div>
          </div>
        )}

        <div className={styles.aksi}>
          <TombolMasuk />
          {!pesan && <p className={styles.petunjuk}>Gunakan akun @pegadaian.co.id</p>}
        </div>

        {!pesan && (
          <div className={styles.kaki}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/pegadaian-logo-horizontal.png" alt="Pegadaian" className={styles.logo} />
          </div>
        )}
      </div>
    </main>
  );
}
