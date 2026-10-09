"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./karyawan.module.css";

const MENU = [
  {
    href: "/pengajuan",
    label: "Pengajuan",
    ikon: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </>
    ),
  },
  {
    href: "/notifikasi",
    label: "Notifikasi",
    ikon: (
      <>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </>
    ),
  },
  {
    href: "/profil",
    label: "Profil",
    ikon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  },
];

export default function NavKaryawan() {
  const lokasi = usePathname();
  return (
    <nav className={styles.nav} aria-label="Menu utama">
      <span className={styles.merek}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/pegadaian-mark.png" alt="" width={28} height={28} />
        HCS
      </span>
      {MENU.map((m) => {
        const aktif = lokasi.startsWith(m.href);
        return (
          <Link key={m.href} href={m.href} className={aktif ? `${styles.menu} ${styles.aktif}` : styles.menu} aria-current={aktif ? "page" : undefined}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {m.ikon}
            </svg>
            <span>{m.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
