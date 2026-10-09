import { useState } from "react";
import logo from "../aset/pegadaian-mark.png";
import styles from "../komponen/admin.module.css";
import ui from "../komponen/ui.module.css";
import { inisial, type Pengguna } from "../jenis";

// Menu sesuai mockup A1. Halaman yang belum dibangun tampil nonaktif sampai tahapnya.
const MENU: { label: string; aktif?: boolean }[] = [
  { label: "Dasbor", aktif: true },
  { label: "Tugasku" },
  { label: "Semua pengajuan" },
  { label: "Data karyawan" },
  { label: "Data TAD" },
  { label: "Tarif SPPD" },
  { label: "Log audit" },
  { label: "Pengaturan" },
];
const NAV_HP: { label: string; glyph: string; aktif?: boolean }[] = [
  { label: "Dasbor", glyph: "D", aktif: true },
  { label: "Tugasku", glyph: "T" },
  { label: "Semua", glyph: "S" },
  { label: "Lainnya", glyph: "⋯" },
];

/** Kerangka Admin: menu samping di laptop, navigasi bawah di HP (mockup A1). */
export default function Admin(p: { pengguna: Pengguna; onKeluar: () => void }) {
  const [menu, setMenu] = useState("Dasbor");
  return (
    <div className={styles.kerangka}>
      <aside className={styles.samping}>
        <div className={styles.merek}>
          <img src={logo} alt="" width={64} height={28} />
          <div>
            <strong>HCS</strong>
            <span>Admin SDM</span>
          </div>
        </div>
        <nav aria-label="Menu Admin" className={styles.menuSamping}>
          {MENU.map((m) =>
            m.aktif ? (
              <button
                key={m.label}
                type="button"
                className={menu === m.label ? `${styles.menu} ${styles.aktif}` : styles.menu}
                aria-current={menu === m.label ? "page" : undefined}
                onClick={() => setMenu(m.label)}
              >
                {m.label}
              </button>
            ) : (
              <span key={m.label} className={`${styles.menu} ${styles.nonaktif}`} aria-disabled="true">
                {m.label}
              </span>
            ),
          )}
        </nav>
      </aside>

      <div className={styles.kolom}>
        <header className={styles.atas}>
          <div className={styles.judulAtas}>
            <span className={styles.peranHp}>Admin SDM</span>
            <h1 className={ui.judul}>{menu}</h1>
          </div>
          <div className={styles.pengguna}>
            <span className={styles.avatar} aria-hidden>
              {inisial(p.pengguna.nama)}
            </span>
            <div className={styles.namaPengguna}>
              <strong>{p.pengguna.nama}</strong>
              <span>Admin SDM</span>
            </div>
            <button type="button" className={`${ui.tombol} ${ui.sekunder} ${ui.kecil}`} onClick={p.onKeluar}>
              Keluar
            </button>
          </div>
        </header>
        <main className={styles.isi}>
          {/* A1 Dasbor dibangun pada Tahap 11. */}
          <p className={styles.kosong}>Tidak ada yang perlu ditindaklanjuti.</p>
        </main>
      </div>

      <nav aria-label="Menu Admin di HP" className={styles.navHp}>
        {NAV_HP.map((n) => (
          <span key={n.label} className={n.aktif ? `${styles.menuHp} ${styles.aktifHp}` : `${styles.menuHp} ${styles.nonaktif}`} aria-disabled={!n.aktif || undefined}>
            <span className={styles.glyph} aria-hidden>
              {n.glyph}
            </span>
            <span>{n.label}</span>
          </span>
        ))}
      </nav>
    </div>
  );
}
