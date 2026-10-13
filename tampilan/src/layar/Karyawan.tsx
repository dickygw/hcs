import { useCallback, useEffect, useState } from "react";
import logo from "../aset/pegadaian-mark.png";
import styles from "../komponen/karyawan.module.css";
import s from "../komponen/pengajuan.module.css";
import ui from "../komponen/ui.module.css";
import { inisial, type Pengguna } from "../jenis";
import { LAYANAN, relatif, rentang, type Detail, type Ringkas } from "../pengajuan";
import { panggil } from "../server";
import DetailPengajuan, { Lencana, Terkirim } from "./DetailPengajuan";
import FormPengajuan, { PilihLayanan } from "./FormPengajuan";

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

/** Layar penuh di atas K1 (K2, K3, sukses, K4); navigasi utama disembunyikan selama layar ini terbuka. */
type Layar =
  | { id: "daftar" }
  | { id: "pilih" }
  | { id: "form"; jenis: string; awal?: Detail }
  | { id: "terkirim"; nomor: string; jenis: string; noSuratTugas: string }
  | { id: "detail"; nomor: string };

/** Kerangka karyawan: navigasi bawah di HP, menu atas di laptop (Design Brief 6). */
export default function Karyawan(p: { pengguna: Pengguna; onKeluar: () => void }) {
  const [menu, setMenu] = useState<Menu>("pengajuan");
  const [layar, setLayar] = useState<Layar>({ id: "daftar" });
  // Daftar K1 di memori (WEB-06); dimuat ulang setelah aksi yang mengubah data.
  const [daftar, setDaftar] = useState<Ringkas[] | null>(null);
  const [galat, setGalat] = useState("");
  const muat = useCallback(() => {
    setGalat("");
    panggil<Ringkas[]>("pengajuanSaya")
      .then(setDaftar)
      .catch((e: Error) => setGalat(e.message));
  }, []);
  useEffect(muat, [muat]);

  const keDaftar = (muatUlang: boolean) => {
    setLayar({ id: "daftar" });
    if (muatUlang) muat();
  };

  if (menu === "pengajuan" && layar.id !== "daftar") {
    const isi =
      layar.id === "pilih" ? (
        <PilihLayanan onPilih={(jenis) => setLayar({ id: "form", jenis })} onTutup={() => keDaftar(false)} />
      ) : layar.id === "form" ? (
        <FormPengajuan
          jenis={layar.jenis}
          awal={layar.awal}
          onTutup={keDaftar}
          onTerkirim={(nomor, noSuratTugas) => {
            setLayar({ id: "terkirim", nomor, jenis: layar.jenis, noSuratTugas });
            muat();
          }}
        />
      ) : layar.id === "terkirim" ? (
        <Terkirim
          nomor={layar.nomor}
          jenis={layar.jenis}
          namaLayanan={LAYANAN.find((l) => l.kode === layar.jenis)?.nama ?? ""}
          noSuratTugas={layar.noSuratTugas}
          onLihat={() => setLayar({ id: "detail", nomor: layar.nomor })}
          onBeranda={() => keDaftar(false)}
        />
      ) : (
        <DetailPengajuan nomor={layar.nomor} namaPengguna={p.pengguna.nama} onKembali={keDaftar} onEdit={(d) => setLayar({ id: "form", jenis: d.jenis, awal: d })} />
      );
    return <div className={styles.kerangka}>{isi}</div>;
  }

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
        {menu === "pengajuan" && (
          <PengajuanSaya
            pengguna={p.pengguna}
            daftar={daftar}
            galat={galat}
            onMuat={muat}
            onAjukan={() => setLayar({ id: "pilih" })}
            onBuka={(nomor) => setLayar({ id: "detail", nomor })}
          />
        )}
        {menu === "notifikasi" && <Notifikasi />}
        {menu === "profil" && <Profil pengguna={p.pengguna} onKeluar={p.onKeluar} />}
      </main>
    </div>
  );
}

const FILTER = [
  { label: "Semua", cocok: () => true },
  { label: "Berjalan", cocok: (x: Ringkas) => ["draf", "dikirim", "diproses", "perlu_revisi"].includes(x.status) },
  { label: "Perlu revisi", cocok: (x: Ringkas) => x.status === "perlu_revisi" },
  { label: "Selesai", cocok: (x: Ringkas) => x.status === "selesai" },
];

/** K1 Pengajuan saya: Perlu revisi di paling atas (Design Brief 4.2). */
function PengajuanSaya(p: { pengguna: Pengguna; daftar: Ringkas[] | null; galat: string; onMuat: () => void; onAjukan: () => void; onBuka: (nomor: string) => void }) {
  const [filter, setFilter] = useState(0);
  const tampil = (p.daftar ?? []).filter(FILTER[filter]!.cocok).sort((a, b) => Number(b.status === "perlu_revisi") - Number(a.status === "perlu_revisi"));
  const kosong = !!p.daftar && !p.daftar.length;
  return (
    <>
      <header className={styles.kepala}>
        <div className={s.kepalaK1}>
          <div>
            <span className={styles.sapaan}>Halo, {p.pengguna.nama.split(" ")[0]}</span>
            <h1 className={ui.judul}>Pengajuan saya</h1>
          </div>
          {!kosong && (
            <button type="button" className={`${ui.tombol} ${ui.utama} ${ui.kecil}`} onClick={p.onAjukan}>
              + Ajukan
            </button>
          )}
        </div>
        {!kosong && (
          <div className={s.chip} role="group" aria-label="Saring status">
            {FILTER.map((f, i) => (
              <button key={f.label} type="button" aria-pressed={filter === i} onClick={() => setFilter(i)}>
                {f.label}
              </button>
            ))}
          </div>
        )}
      </header>
      {kosong ? (
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
          <button type="button" className={`${ui.tombol} ${ui.utama}`} onClick={p.onAjukan}>
            + Ajukan
          </button>
        </section>
      ) : (
        <div className={s.daftar}>
          {p.galat && (
            <div className={s.galat} role="alert">
              <strong>Daftar pengajuan gagal dimuat.</strong>
              <span>Periksa koneksi internet, lalu coba lagi.</span>
              <button type="button" className={`${ui.tombol} ${ui.sekunder} ${ui.kecil}`} onClick={p.onMuat}>
                Coba lagi
              </button>
            </div>
          )}
          {!p.daftar &&
            !p.galat &&
            [1, 2, 3].map((i) => (
              <div key={i} className={s.kerangkaKartu} aria-hidden>
                <span />
                <span />
                <span style={{ width: "50%" }} />
              </div>
            ))}
          {p.daftar && !tampil.length && <p className={styles.teksKosong}>Tidak ada pengajuan dengan status ini.</p>}
          {tampil.map((x) => (
            <button key={x.nomor} type="button" className={`${s.kartu} ${x.status === "perlu_revisi" ? s.kartuRevisi : ""}`} onClick={() => p.onBuka(x.nomor)}>
              <div className={s.isiKartu}>
                <div className={s.barisAtas}>
                  <span className={s.namaLayanan}>{x.namaLayanan}</span>
                  <Lencana status={x.status} />
                </div>
                <span className={s.nomor}>{[x.nomor, x.noSuratTugas].filter(Boolean).join(" · ")}</span>
                <div className={s.perjalanan}>
                  <span>{[x.kota, rentang(x.tglBerangkat, x.tglKembali)].filter(Boolean).join(" · ") || "Belum diisi"}</span>
                  {x.status !== "perlu_revisi" && <span className={s.waktu}>{relatif(x.diperbaruiPada)}</span>}
                </div>
              </div>
              {x.status === "perlu_revisi" && (
                <div className={s.catatanRevisi}>
                  {x.catatan ? x.catatan + " " : ""}Diperbarui {relatif(x.diperbaruiPada).toLowerCase()}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
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
