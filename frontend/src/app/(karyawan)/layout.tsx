import Sesi from "@/components/Sesi";
import NavKaryawan from "./NavKaryawan";
import styles from "./karyawan.module.css";

/** Kerangka karyawan: navigasi bawah di HP, menu atas di laptop (Design Brief 6). */
export default function LayoutKaryawan({ children }: { children: React.ReactNode }) {
  return (
    <Sesi peran="karyawan">
      <div className={styles.kerangka}>
        <NavKaryawan />
        <main className={styles.utama}>{children}</main>
      </div>
    </Sesi>
  );
}
