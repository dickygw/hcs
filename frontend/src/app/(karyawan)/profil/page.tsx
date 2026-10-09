"use client";

import { useSesi } from "@/components/Sesi";
import ui from "@/components/ui.module.css";
import styles from "../karyawan.module.css";

const inisial = (nama: string) =>
  nama
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k[0]?.toUpperCase())
    .join("");

/** K6 Profil. */
export default function Profil() {
  const { pengguna, keluar } = useSesi();
  return (
    <>
      <header className={styles.kepala}>
        <h1 className={ui.judul}>Profil</h1>
      </header>
      <div className={styles.isi}>
        <section className={styles.kartu}>
          <div className={styles.garisMerek} />
          <div className={styles.identitas}>
            <span className={styles.avatar} aria-hidden>
              {inisial(pengguna.nama)}
            </span>
            <div>
              <div className={styles.nama}>{pengguna.nama}</div>
              <div className={styles.email}>{pengguna.email}</div>
            </div>
          </div>
          <dl className={styles.rincian}>
            <div>
              <dt>NIK</dt>
              <dd>{pengguna.nik ?? "-"}</dd>
            </div>
            <div>
              <dt>Jabatan</dt>
              <dd>{pengguna.jabatan ?? "-"}</dd>
            </div>
            <div>
              <dt>Unit kerja</dt>
              <dd>{pengguna.unitKerja ?? "-"}</dd>
            </div>
          </dl>
        </section>
        <p className={styles.catatan}>Data tidak sesuai? Hubungi Admin SDM untuk pembaruan data.</p>
        <div className={styles.bawah}>
          <button type="button" className={`${ui.tombol} ${ui.bahaya} ${ui.penuh}`} onClick={keluar}>
            Keluar
          </button>
        </div>
      </div>
    </>
  );
}
