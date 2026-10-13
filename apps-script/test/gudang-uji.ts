import type { Gudang } from "../src/pengajuan";
import { TABEL, type Baris, type NamaTabel } from "../src/skema";

/** Gudang di memori untuk tes: tabel = array objek, file = Map. */
export function gudangUji() {
  const db = Object.fromEntries(Object.keys(TABEL).map((t) => [t, [] as Record<string, string>[]])) as Record<NamaTabel, Record<string, string>[]>;
  const lengkap = <T extends NamaTabel>(t: T, o: Partial<Baris<T>>) => Object.fromEntries(TABEL[t].kolom.map((k) => [k, String((o as Record<string, unknown>)[k] ?? "")]));
  const file = new Map<string, Uint8Array>();
  const nomor: Record<string, number> = {};
  let n = 0;
  let detik = 0;
  const g: Gudang = {
    baca: (t) => db[t].map((x) => ({ ...x })) as never,
    tambah: (t, d) => db[t].push(...d.map((o) => lengkap(t, o))),
    ubah: (t, i, o) => (db[t][i] = lengkap(t, o)),
    gantiSemua: (t, d) => (db[t] = d.map((o) => lengkap(t, o))),
    kunci: (fn) => fn(),
    kini: () => new Date(Date.UTC(2026, 9, 13, 0, 0, detik++)).toISOString(),
    id: () => "id" + n++,
    nomorBerikut: (a) => (nomor[a] = (nomor[a] ?? 0) + 1),
    file: {
      simpan: (_n, nama, _t, isi) => (file.set("drive-" + nama, isi), "drive-" + nama),
      hapus: (id) => void file.delete(id),
      ambil: (id) => Buffer.from(file.get(id)!).toString("base64"),
    },
  };
  return { g, db, file };
}

export const PDF = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
export const b64 = (b: Uint8Array) => Buffer.from(b).toString("base64");
export const dariB64 = (s: string) => new Uint8Array(Buffer.from(s, "base64"));
export const ISIAN = {
  no_surat_tugas: "ST/0412/KW-IV/2026", kota_tujuan: "Samarinda", tgl_berangkat: "2026-10-06", tgl_kembali: "2026-10-08",
  menginap: "ya", jarak: "", moda_transportasi: "pesawat", kendaraan_dinas: "tidak",
  kota_asal: "", waktu_berangkat: "", waktu_kembali: "", nama_hotel: "", catatan: "",
};
