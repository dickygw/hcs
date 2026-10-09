import { useCallback, useEffect, useState } from "react";
import SesiBerakhir from "./komponen/SesiBerakhir";
import type { HasilMulai, Pengguna } from "./jenis";
import Admin from "./layar/Admin";
import BelumTerdaftar from "./layar/BelumTerdaftar";
import Karyawan from "./layar/Karyawan";
import SudahKeluar from "./layar/SudahKeluar";
import { DIAM_MAKS_MS, diamSejak, EVENT_SESI_BERAKHIR, panggil } from "./server";

type Keadaan =
  | { layar: "memuat" }
  | { layar: "galat"; pesan: string }
  | { layar: "belumTerdaftar"; email: string; kontak: string; urlAplikasi: string }
  | { layar: "masuk"; pengguna: Pengguna }
  | { layar: "keluar" };

/**
 * Alur utama: mulai sesi → U2 / kerangka Karyawan / kerangka Admin; U3 saat sesi berakhir; layar keluar.
 * Peran di sini hanya mengatur menu; setiap panggilan tetap diperiksa server (AUTH-04).
 * Data layar hanya disimpan di memori komponen (WEB-06), hilang saat keluar atau terkunci.
 */
export default function App() {
  const [keadaan, setKeadaan] = useState<Keadaan>({ layar: "memuat" });
  const [terkunci, setTerkunci] = useState(false);
  const [memuat, setMemuat] = useState(false);

  const mulai = useCallback(async () => {
    setMemuat(true);
    try {
      const h = await panggil<HasilMulai>("mulai");
      setKeadaan(h.terdaftar ? { layar: "masuk", pengguna: h.pengguna } : { layar: "belumTerdaftar", ...h });
      setTerkunci(false);
    } catch (e) {
      setKeadaan({ layar: "galat", pesan: (e as Error).message });
    } finally {
      setMemuat(false);
    }
  }, []);

  const keluar = useCallback(async () => {
    await panggil("keluar").catch(() => undefined);
    setTerkunci(false);
    setKeadaan({ layar: "keluar" }); // data layar sebelumnya ikut dibuang
  }, []);

  useEffect(() => {
    void mulai();
  }, [mulai]);

  // U3: dikunci setelah 15 menit tanpa panggilan ke server, atau saat server menolak karena sesi berakhir.
  useEffect(() => {
    if (keadaan.layar !== "masuk") return;
    const kunci = () => setTerkunci(true);
    const jam = setInterval(() => Date.now() - diamSejak() > DIAM_MAKS_MS && kunci(), 30_000);
    window.addEventListener(EVENT_SESI_BERAKHIR, kunci);
    return () => {
      clearInterval(jam);
      window.removeEventListener(EVENT_SESI_BERAKHIR, kunci);
    };
  }, [keadaan.layar]);

  switch (keadaan.layar) {
    case "memuat":
      return null;
    case "galat":
      return <p style={{ padding: 24, font: "400 15px/1.5 var(--font-core)", color: "#c62828" }}>{keadaan.pesan}</p>;
    case "belumTerdaftar":
      return <BelumTerdaftar email={keadaan.email} kontak={keadaan.kontak} urlAplikasi={keadaan.urlAplikasi} onKeluar={keluar} />;
    case "keluar":
      return <SudahKeluar onMasuk={mulai} memuat={memuat} />;
    case "masuk": {
      const Kerangka = keadaan.pengguna.peran === "admin" ? Admin : Karyawan;
      return (
        <>
          {/* Saat terkunci, isi layar tidak dirender agar data tidak terlihat di belakang U3. */}
          {!terkunci && <Kerangka pengguna={keadaan.pengguna} onKeluar={keluar} />}
          {terkunci && <SesiBerakhir onMasuk={mulai} memuat={memuat} />}
        </>
      );
    }
  }
}
