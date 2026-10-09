"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { api, aturCsrf, BERANDA, diamSejak, DIAM_MAKS_MS, EVENT_SESI_BERAKHIR, type Peran } from "@/lib/api";
import styles from "./Sesi.module.css";
import ui from "./ui.module.css";

export interface Pengguna {
  email: string;
  peran: Peran;
  nama: string;
  nik: string | null;
  jabatan: string | null;
  unitKerja: string | null;
}

const KonteksSesi = createContext<{ pengguna: Pengguna; keluar: () => Promise<void> } | null>(null);

export function useSesi() {
  const s = useContext(KonteksSesi);
  if (!s) throw new Error("useSesi dipakai di luar <Sesi>");
  return s;
}

async function keluar() {
  await api("/api/auth/keluar", { method: "POST" });
  window.location.href = "/masuk";
}

/**
 * Memuat sesi dari backend dan mengarahkan pengguna ke beranda perannya.
 * Ini hanya kenyamanan tampilan; hak akses sebenarnya diperiksa backend di setiap permintaan.
 */
export default function Sesi({ peran, children }: { peran: Peran; children: React.ReactNode }) {
  const router = useRouter();
  const [pengguna, setPengguna] = useState<Pengguna | null>(null);
  const [berakhir, setBerakhir] = useState(false);

  useEffect(() => {
    api("/api/auth/sesi")
      .then(async (res) => {
        if (!res.ok) return router.replace("/masuk");
        const data: { pengguna: Pengguna; csrf: string } = await res.json();
        aturCsrf(data.csrf);
        if (data.pengguna.peran !== peran) return router.replace(BERANDA[data.pengguna.peran]);
        setPengguna(data.pengguna);
      })
      .catch(() => router.replace("/masuk"));
  }, [peran, router]);

  useEffect(() => {
    if (!pengguna) return;
    const habis = () => setBerakhir(true);
    const jam = setInterval(() => Date.now() - diamSejak() > DIAM_MAKS_MS && habis(), 30_000);
    window.addEventListener(EVENT_SESI_BERAKHIR, habis);
    return () => {
      clearInterval(jam);
      window.removeEventListener(EVENT_SESI_BERAKHIR, habis);
    };
  }, [pengguna]);

  if (!pengguna) return null;
  return (
    <KonteksSesi value={{ pengguna, keluar }}>
      {children}
      {berakhir && <SesiBerakhir />}
    </KonteksSesi>
  );
}

/** U3 Sesi berakhir. */
function SesiBerakhir() {
  return (
    <div className={styles.latar}>
      <div className={styles.lembar} role="alertdialog" aria-modal="true" aria-labelledby="judul-sesi">
        <div className={styles.pegangan} />
        <h2 id="judul-sesi" className={styles.judul}>
          Sesi Anda berakhir
        </h2>
        <p className={styles.teks}>Tidak ada aktivitas selama 15 menit. Draf form yang belum terkirim tetap tersimpan.</p>
        <a href="/api/auth/google" className={`${ui.tombol} ${ui.utama} ${ui.penuh}`} autoFocus>
          Masuk kembali
        </a>
      </div>
    </div>
  );
}
