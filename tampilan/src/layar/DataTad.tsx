import { useState } from "react";
import { KOLOM_TAD, type RingkasanTad } from "../../../apps-script/src/master";
import DaftarMaster, { tanggal, type Kolom } from "../komponen/DaftarMaster";
import s from "../komponen/data.module.css";
import ui from "../komponen/ui.module.css";
import WizardUnggah from "../komponen/WizardUnggah";
import { unduh } from "../unggah";
import { buatXlsx } from "../xlsx";

interface Tad {
  nik: string;
  nama: string;
  vendor: string;
  unit: string;
  rekening: string; // sudah tersamar dari server (••••1234)
  sumber: string;
  terverifikasi: boolean;
  aktif: boolean;
}

/** A6 Data TAD + wizard unggah template (PRD 6.3–6.4). Komponen sama dengan A5. */
export default function DataTad() {
  const [wizard, setWizard] = useState(false);
  const [versi, setVersi] = useState(0);

  const kolom: Kolom<Tad>[] = [
    { judul: "NIK", isi: (t) => t.nik, redup: true },
    { judul: "Nama", isi: (t) => t.nama },
    { judul: "Vendor", isi: (t) => t.vendor, redup: true },
    { judul: "Unit", isi: (t) => t.unit, redup: true },
    { judul: "Rekening", isi: (t) => t.rekening || <span className={`${s.lencana} ${s.lencanaEmas}`}>Kosong</span> },
    {
      judul: "Sumber data",
      isi: (t) => (t.terverifikasi ? <span className={s.redup}>Unggahan</span> : <span className={`${s.lencana} ${s.lencanaEmas}`}>Input manual, belum terverifikasi</span>),
    },
    { judul: "Status", isi: (t) => <span className={`${s.lencana} ${t.aktif ? "" : s.lencanaAbu}`}>{t.aktif ? "Aktif" : "Nonaktif"}</span> },
  ];

  if (wizard) {
    return (
      <WizardUnggah<RingkasanTad>
        jejak="Data TAD / Unggah template"
        kolom={KOLOM_TAD}
        rutePratinjau="pratinjauTad"
        ruteTerapkan="terapkanTad"
        bolehLewati
        keterangan={
          <>
            Unggah file sesuai Template Unggah TAD dengan kolom: {Object.keys(KOLOM_TAD).join(", ")}. Rekening dirapikan menjadi angka; rekening BRI wajib 15 digit. Tanggal
            akhir kontrak boleh kosong. TAD yang tidak ada di file dinonaktifkan, tidak dihapus.
          </>
        }
        kartuAwal={0}
        kartu={(r) => [
          { label: "TAD baru", sub: "Ditambahkan sebagai aktif", kolom: ["NIK", "Nama", "Vendor"], baris: r.baru.map((x) => [x.nik, x.nama, x.vendor]) },
          { label: "Berubah", sub: "Data atau rekening diperbarui", kolom: ["NIK", "Nama", "Vendor"], baris: r.berubah.map((x) => [x.nik, x.nama, x.vendor]) },
          { label: "Tidak ada lagi", sub: "Dinonaktifkan, tidak dihapus", kolom: ["NIK", "Nama", "Vendor"], baris: r.nonaktif.map((x) => [x.nik, x.nama, x.vendor]) },
          { label: "Rekening kosong", sub: "Tetap diimpor, lengkapi kemudian", kolom: ["NIK", "Nama"], baris: r.rekeningKosong.map((x) => [x.nik, x.nama]) },
        ]}
        labelTerapkan="Terapkan unggahan"
        pesanSelesai={(h) =>
          `Unggahan diterapkan: ${h.baru} TAD baru, ${h.berubah} berubah, ${h.nonaktif} dinonaktifkan.` + (h.dilewati ? ` ${h.dilewati} baris bermasalah tidak diimpor.` : "")
        }
        onTutup={(diterapkan) => {
          setWizard(false);
          if (diterapkan) setVersi((v) => v + 1);
        }}
      />
    );
  }

  return (
    <div className={s.halaman}>
      <DaftarMaster<Tad>
        rute="dataTad"
        kolom={kolom}
        versi={versi}
        umurLabel={(hari, r) =>
          r ? (
            <>
              Unggahan TAD terakhir {tanggal(r.pada)} · {hari} hari lalu · oleh {r.oleh}
            </>
          ) : (
            <>Data TAD belum pernah diunggah dari template.</>
          )
        }
        tombol={
          <>
            <button type="button" className={`${ui.tombol} ${ui.sekunder}`} onClick={() => unduh("Template_Unggah_TAD.xlsx", buatXlsx("Template Unggah TAD", [Object.keys(KOLOM_TAD)]))}>
              Unduh template kosong
            </button>
            <button type="button" className={`${ui.tombol} ${ui.utama}`} onClick={() => setWizard(true)}>
              Unggah template
            </button>
          </>
        }
      />
    </div>
  );
}
