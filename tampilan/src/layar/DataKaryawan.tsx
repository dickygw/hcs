import { useEffect, useRef, useState } from "react";
import { KOLOM_HCMS, type RingkasanHcms } from "../../../apps-script/src/master";
import DaftarMaster, { tanggal, type Kolom } from "../komponen/DaftarMaster";
import s from "../komponen/data.module.css";
import ui from "../komponen/ui.module.css";
import WizardUnggah from "../komponen/WizardUnggah";
import { panggil } from "../server";

interface Karyawan {
  nik: string;
  nama: string;
  jabatan: string;
  unit: string;
  jg: string;
  jgPerdin: string;
  golongan: string;
  aktif: boolean;
}

const JUDUL_UMUR = { hijau: "Data karyawan mutakhir", kuning: "Segera sinkronkan data karyawan", merah: "Data karyawan kedaluwarsa" };

/** A5 Data karyawan + wizard Sinkronisasi HCMS (mockup A5, PRD 6.1–6.2). */
export default function DataKaryawan() {
  const [wizard, setWizard] = useState(false);
  const [versi, setVersi] = useState(0);
  const [koreksi, setKoreksi] = useState<Karyawan | null>(null);

  const kolom: Kolom<Karyawan>[] = [
    { judul: "NIK", isi: (k) => k.nik, redup: true },
    { judul: "Nama", isi: (k) => k.nama },
    { judul: "Jabatan", isi: (k) => k.jabatan, redup: true },
    { judul: "Unit", isi: (k) => k.unit, redup: true },
    {
      judul: "JG",
      isi: (k) =>
        k.jgPerdin ? (
          <span title={`JG HCMS ${k.jg || "-"}, dikoreksi untuk Perdin`}>
            {k.jgPerdin} <span className={`${s.lencana} ${s.lencanaEmas}`}>Koreksi</span>
          </span>
        ) : (
          k.jg || "-"
        ),
    },
    { judul: "Golongan", isi: (k) => k.golongan || <span className={`${s.lencana} ${s.lencanaEmas}`}>Perlu koreksi JG</span> },
    { judul: "Status", isi: (k) => <span className={`${s.lencana} ${k.aktif ? "" : s.lencanaAbu}`}>{k.aktif ? "Aktif" : "Nonaktif"}</span> },
    {
      judul: "",
      isi: (k) => (
        <button type="button" className={s.tautan} onClick={() => setKoreksi(k)}>
          Koreksi JG
        </button>
      ),
    },
  ];

  if (wizard) {
    return (
      <WizardUnggah<RingkasanHcms>
        jejak="Data karyawan / Sinkronisasi HCMS"
        kolom={KOLOM_HCMS}
        rutePratinjau="pratinjauHcms"
        ruteTerapkan="terapkanHcms"
        bolehLewati={false}
        keterangan={
          <>
            Unggah file ekspor HCMS (format Adv) apa adanya, tanpa diolah. Hanya 12 kolom yang dibaca dan dikirim ke HCS: {Object.keys(KOLOM_HCMS).join(", ")}. Kolom lain
            seperti NIK KTP, NPWP, dan rekening tidak pernah meninggalkan laptop Anda.
          </>
        }
        kartuAwal={2}
        kartu={(r) => [
          { label: "Karyawan baru", sub: "Ditambahkan sebagai aktif", kolom: ["NIK", "Nama", "Unit"], baris: r.baru.map((x) => [x.nik, x.nama, x.unit]) },
          { label: "Tidak ada lagi", sub: "Dinonaktifkan, tidak dihapus", kolom: ["NIK", "Nama", "Unit"], baris: r.nonaktif.map((x) => [x.nik, x.nama, x.unit]) },
          {
            label: "Berubah JG atau golongan",
            sub: `${r.berubahJg.filter((x) => x.pindahGolongan).length} berpindah golongan`,
            kolom: ["NIK", "Nama", "Jabatan", "Sebelumnya", "Menjadi"],
            baris: r.berubahJg.map((x) => [x.nik, x.nama, x.jabatan, x.dari, x.ke]),
          },
          { label: "Pindah unit", sub: "Unit kerja diperbarui", kolom: ["NIK", "Nama", "Sebelumnya", "Menjadi"], baris: r.pindahUnit.map((x) => [x.nik, x.nama, x.dari, x.ke]) },
        ]}
        labelTerapkan="Terapkan sinkronisasi"
        pesanSelesai={(h) => `Sinkronisasi diterapkan: ${h.baru} karyawan baru, ${h.berubah} perubahan JG atau unit, ${h.nonaktif} dinonaktifkan.`}
        onTutup={(diterapkan) => {
          setWizard(false);
          if (diterapkan) setVersi((v) => v + 1);
        }}
      />
    );
  }

  return (
    <div className={s.halaman}>
      <DaftarMaster<Karyawan>
        rute="dataKaryawan"
        kolom={kolom}
        versi={versi}
        berwarna
        umurLabel={(hari, r) =>
          r ? (
            <>
              <b>{JUDUL_UMUR[hari < 7 ? "hijau" : hari <= 14 ? "kuning" : "merah"]}</b> · Sinkronisasi HCMS terakhir {tanggal(r.pada)} · {hari} hari lalu · oleh {r.oleh}
            </>
          ) : (
            <>
              <b>Data karyawan belum pernah disinkronkan.</b> Unggah ekspor HCMS terbaru.
            </>
          )
        }
        tombol={
          <button type="button" className={`${ui.tombol} ${ui.utama}`} onClick={() => setWizard(true)}>
            Sinkronisasi HCMS
          </button>
        }
      />
      {koreksi && (
        <KoreksiJg
          karyawan={koreksi}
          onTutup={(tersimpan) => {
            setKoreksi(null);
            if (tersimpan) setVersi((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}

/** Koreksi JG untuk Perdin: alasan wajib, tercatat di log, tidak tertimpa sinkronisasi (PRD 5.5). */
function KoreksiJg(p: { karyawan: Karyawan; onTutup: (tersimpan: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [jg, setJg] = useState(p.karyawan.jgPerdin);
  const [alasan, setAlasan] = useState("");
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState("");

  useEffect(() => ref.current?.showModal(), []);

  return (
    <dialog ref={ref} className={s.dialog} onClose={() => p.onTutup(false)} aria-labelledby="judul-koreksi">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setMemuat(true);
          setGalat("");
          try {
            await panggil("koreksiJg", { nik: p.karyawan.nik, jg, alasan });
            p.onTutup(true);
          } catch (er) {
            setGalat((er as Error).message);
            setMemuat(false);
          }
        }}
      >
        <h2 id="judul-koreksi">Koreksi JG untuk Perdin</h2>
        <span className={s.redup}>
          {p.karyawan.nama} · {p.karyawan.nik} · JG HCMS {p.karyawan.jg || "-"}
        </span>
        <label className={s.label}>
          JG untuk Perdin
          <small>Kosongkan untuk menghapus koreksi dan kembali memakai JG HCMS.</small>
          <input className={s.isian} inputMode="numeric" pattern="\d{1,2}" maxLength={2} value={jg} onChange={(e) => setJg(e.target.value.replace(/\D/g, ""))} />
        </label>
        <label className={s.label}>
          Alasan
          <small>Wajib diisi. Tercatat di log perubahan.</small>
          <textarea className={s.isian} rows={3} required minLength={5} maxLength={300} value={alasan} onChange={(e) => setAlasan(e.target.value)} />
        </label>
        {galat && (
          <div className={s.galat} role="alert">
            {galat}
          </div>
        )}
        <div className={s.tombolBawah}>
          <button type="button" className={`${ui.tombol} ${ui.sekunder}`} onClick={() => ref.current?.close()} disabled={memuat}>
            Batal
          </button>
          <button type="submit" className={`${ui.tombol} ${ui.utama}`} disabled={memuat}>
            {memuat ? <span className={ui.putar} aria-hidden /> : "Simpan koreksi"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
