"use client";

import { useSesi } from "@/components/Sesi";
import ui from "@/components/ui.module.css";
import styles from "../karyawan.module.css";

/** K1 Pengajuan saya. Daftar, filter, dan tombol Ajukan dibangun pada Tahap 5. */
export default function PengajuanSaya() {
  const { pengguna } = useSesi();
  return (
    <>
      <header className={styles.kepala}>
        <span className={styles.sapaan}>Halo, {pengguna.nama.split(" ")[0]}</span>
        <h1 className={ui.judul}>Pengajuan saya</h1>
      </header>
      <section className={styles.kosong}>
        <div className={styles.ilustrasi} aria-hidden>
          <span>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
          </span>
        </div>
        <h2 className={styles.judulKosong}>Belum ada pengajuan</h2>
        <p className={styles.teksKosong}>Pengajuan klaim, SPPD, dan tiket yang Anda kirim akan tampil di sini.</p>
      </section>
    </>
  );
}
