"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSesi } from "@/components/Sesi";
import ui from "@/components/ui.module.css";
import styles from "./admin.module.css";

// Menu sesuai mockup A1. Halaman yang belum dibangun tampil nonaktif sampai tahapnya.
const MENU: { label: string; href?: string }[] = [
  { label: "Dasbor", href: "/admin" },
  { label: "Tugasku" },
  { label: "Semua pengajuan" },
  { label: "Data karyawan" },
  { label: "Data TAD" },
  { label: "Tarif SPPD" },
  { label: "Log audit" },
  { label: "Pengaturan" },
];
const NAV_HP: { label: string; glyph: string; href?: string }[] = [
  { label: "Dasbor", glyph: "D", href: "/admin" },
  { label: "Tugasku", glyph: "T" },
  { label: "Semua", glyph: "S" },
  { label: "Lainnya", glyph: "⋯" },
];

const inisial = (nama: string) =>
  nama
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k[0]?.toUpperCase())
    .join("");

/** Kerangka Admin: menu samping di laptop, navigasi bawah di HP (mockup A1). */
export default function KerangkaAdmin({ children }: { children: React.ReactNode }) {
  const lokasi = usePathname();
  const { pengguna, keluar } = useSesi();
  const judul = MENU.find((m) => m.href === lokasi)?.label ?? "";

  return (
    <div className={styles.kerangka}>
      <aside className={styles.samping}>
        <div className={styles.merek}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/pegadaian-mark.png" alt="" width={64} height={28} />
          <div>
            <strong>HCS</strong>
            <span>Admin SDM</span>
          </div>
        </div>
        <nav aria-label="Menu Admin" className={styles.menuSamping}>
          {MENU.map((m) =>
            m.href ? (
              <Link
                key={m.label}
                href={m.href}
                className={lokasi === m.href ? `${styles.menu} ${styles.aktif}` : styles.menu}
                aria-current={lokasi === m.href ? "page" : undefined}
              >
                {m.label}
              </Link>
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
            <h1 className={ui.judul}>{judul}</h1>
          </div>
          <div className={styles.pengguna}>
            <span className={styles.avatar} aria-hidden>
              {inisial(pengguna.nama)}
            </span>
            <div className={styles.namaPengguna}>
              <strong>{pengguna.nama}</strong>
              <span>Admin SDM</span>
            </div>
            <button type="button" className={`${ui.tombol} ${ui.sekunder} ${ui.kecil}`} onClick={keluar}>
              Keluar
            </button>
          </div>
        </header>
        <main className={styles.isi}>{children}</main>
      </div>

      <nav aria-label="Menu Admin di HP" className={styles.navHp}>
        {NAV_HP.map((n) => {
          const isi = (
            <>
              <span className={styles.glyph} aria-hidden>
                {n.glyph}
              </span>
              <span>{n.label}</span>
            </>
          );
          return n.href ? (
            <Link key={n.label} href={n.href} className={lokasi === n.href ? `${styles.menuHp} ${styles.aktifHp}` : styles.menuHp}>
              {isi}
            </Link>
          ) : (
            <span key={n.label} className={`${styles.menuHp} ${styles.nonaktif}`} aria-disabled="true">
              {isi}
            </span>
          );
        })}
      </nav>
    </div>
  );
}
