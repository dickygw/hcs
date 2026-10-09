import { useState } from "react";
import logo from "../aset/pegadaian-mark.png";
import styles from "../komponen/karyawan.module.css";
import ui from "../komponen/ui.module.css";
import { inisial, type Pengguna } from "../jenis";

type Menu = "pengajuan" | "notifikasi" | "profil";

const MENU: { id: Menu; label: string; ikon: React.ReactNode }[] = [
  {
    id: "pengajuan",
    label: "Pengajuan",
    ikon: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </>
    ),
  },
  {
    id: "notifikasi",
    label: "Notifikasi",
    ikon: (
      <>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </>
    ),
  },
  {
    id: "profil",
    label: "Profil",
    ikon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  },
];

/** Kerangka karyawan: navigasi bawah di HP, menu atas di laptop (Design Brief 6). */
export default function Karyawan(p: { pengguna: Pengguna; onKeluar: () => void }) {
  const [menu, setMenu] = useState<Menu>("pengajuan");
  return (
    <div className={styles.kerangka}>
      <nav className={styles.nav} aria-label="Menu utama">
        <span className={styles.merek}>
          <img src={logo} alt="" width={55} height={24} />
          HCS
        </span>
        {MENU.map((m) => (
          <button
            key={m.id}
            type="button"
            className={menu === m.id ? `${styles.menu} ${styles.aktif}` : styles.menu}
            aria-current={menu === m.id ? "page" : undefined}
            onClick={() => setMenu(m.id)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {m.ikon}
            </svg>
            <span>{m.label}</span>
          </button>
        ))}
      </nav>
      <main className={styles.utama}>
        {menu === "pengajuan" && <PengajuanSaya pengguna={p.pengguna} />}
        {menu === "notifikasi" && <Notifikasi />}
        {menu === "profil" && <Profil pengguna={p.pengguna} onKeluar={p.onKeluar} />}
      </main>
    </div>
  );
}

/** K1 Pengajuan saya. Daftar, filter, dan tombol Ajukan dibangun pada Tahap 5. */
function PengajuanSaya({ pengguna }: { pengguna: Pengguna }) {
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

/** K5 Notifikasi. Isi dibangun pada Tahap 12. */
function Notifikasi() {
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

/** K6 Profil. */
function Profil({ pengguna, onKeluar }: { pengguna: Pengguna; onKeluar: () => void }) {
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
              <dd>{pengguna.nik || "-"}</dd>
            </div>
            <div>
              <dt>Jabatan</dt>
              <dd>{pengguna.jabatan || "-"}</dd>
            </div>
            <div>
              <dt>Unit kerja</dt>
              <dd>{pengguna.unitKerja || "-"}</dd>
            </div>
          </dl>
        </section>
        <p className={styles.catatan}>Data tidak sesuai? Hubungi Admin SDM untuk pembaruan data.</p>
        <div className={styles.bawah}>
          <button type="button" className={`${ui.tombol} ${ui.bahaya} ${ui.penuh}`} onClick={onKeluar}>
            Keluar
          </button>
        </div>
      </div>
    </>
  );
}
