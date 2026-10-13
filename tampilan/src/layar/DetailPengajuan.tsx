import { useEffect, useRef, useState } from "react";
import s from "../komponen/pengajuan.module.css";
import ui from "../komponen/ui.module.css";
import { dariBase64, konfig, LABEL_STATUS, namaDokumen, rupiah, tanggal, ukuran, waktuLengkap, waktuPendek, type Detail, type Status } from "../pengajuan";
import { panggil } from "../server";
import ButirIsian from "./ButirIsian";
import { unduh } from "../unggah";

export function Lencana({ status }: { status: Status }) {
  return <span className={`${s.lencana} ${s["s_" + status]}`}>{LABEL_STATUS[status]}</span>;
}

function Kembali({ onKlik, judul }: { onKlik: () => void; judul: string }) {
  return (
    <header className={s.atas}>
      <div className={s.barisJudul}>
        <div>
          <button type="button" className={s.ikon} onClick={onKlik} aria-label="Kembali">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className={s.judulBesar}>{judul}</h1>
        </div>
      </div>
    </header>
  );
}

/** K3 sukses kirim. */
export function Terkirim(p: { nomor: string; jenis: string; namaLayanan: string; noSuratTugas: string; onLihat: () => void; onBeranda: () => void }) {
  return (
    <div className={s.layar}>
      <div className={s.sukses}>
        <div className={s.centangBesar} aria-hidden>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h1>Pengajuan {p.nomor} terkirim</h1>
        <p>Status dapat dipantau di halaman Pengajuan saya.</p>
        <section className={s.blok}>
          <dl className={s.ringkas}>
            <dt>Jenis</dt>
            <dd>{p.namaLayanan}</dd>
            <dt>{konfig(p.jenis).singkat}</dt>
            <dd>{p.noSuratTugas}</dd>
            <dt>Status</dt>
            <dd>
              <Lencana status="dikirim" />
            </dd>
          </dl>
        </section>
        <div className={s.tombolKolom}>
          <button type="button" className={`${ui.tombol} ${ui.utama} ${ui.penuh}`} onClick={p.onLihat}>
            Lihat pengajuan
          </button>
          <button type="button" className={`${ui.tombol} ${ui.sekunder} ${ui.penuh}`} onClick={p.onBeranda}>
            Kembali ke beranda
          </button>
        </div>
      </div>
    </div>
  );
}

/** K4 Detail pengajuan: satu panggilan memuat isian, riwayat, dokumen, dan TAD (PRD 9.1 #3). */
export default function DetailPengajuan(p: { nomor: string; namaPengguna: string; onKembali: (berubah: boolean) => void; onEdit: (d: Detail) => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [galat, setGalat] = useState("");
  const [batal, setBatal] = useState(false);

  const muat = () => {
    setGalat("");
    panggil<Detail>("bukaPengajuan", { nomor: p.nomor })
      .then(setD)
      .catch((e: Error) => setGalat(e.message));
  };
  useEffect(muat, [p.nomor]);

  async function unduhDok(id: string) {
    try {
      const f = await panggil<{ nama: string; tipe: string; data: string }>("unduhDokumen", { id });
      unduh(f.nama || "dokumen", dariBase64(f.data), f.tipe);
    } catch (e) {
      setGalat((e as Error).message);
    }
  }

  const terakhir = d?.riwayat.at(-1);
  const sejakDiproses = d?.riwayat.filter((r) => r.status === "diproses").at(-1);
  return (
    <div className={s.layar}>
      <Kembali judul="Detail pengajuan" onKlik={() => p.onKembali(false)} />
      <div className={`${s.badan} ${s.badanAbu}`}>
        {galat && (
          <div className={s.galat} role="alert">
            <strong>{galat}</strong>
            <button type="button" className={`${ui.tombol} ${ui.sekunder} ${ui.kecil}`} onClick={muat}>
              Coba lagi
            </button>
          </div>
        )}
        {!d && !galat && (
          <div className={s.kerangkaKartu} aria-label="Memuat">
            <span />
            <span />
            <span />
          </div>
        )}
        {d && (
          <>
            <section className={s.blok}>
              <div className={s.barisAtas}>
                <span className={s.namaLayanan}>{d.namaLayanan}</span>
                <Lencana status={d.status} />
              </div>
              <span className={s.nomor}>
                {d.nomor}
                {d.isian.no_surat_tugas && ` · ${d.isian.no_surat_tugas}`}
              </span>
            </section>

            {d.status === "perlu_revisi" && terakhir && (
              <div className={s.kotakOranye}>
                <strong>Catatan Admin SDM</strong>
                <span>{terakhir.catatan || "Periksa kembali isian dan dokumen Anda."}</span>
                <small>
                  {terakhir.oleh} · {waktuLengkap(terakhir.pada)}
                </small>
              </div>
            )}
            {d.status === "ditolak" && terakhir && (
              <div className={s.kotakMerah}>
                <strong>Alasan penolakan</strong>
                <span>{terakhir.catatan || "-"}</span>
                <small>
                  {terakhir.oleh} · {waktuLengkap(terakhir.pada)}
                </small>
              </div>
            )}
            {d.status === "diproses" && sejakDiproses && <div className={s.kotakInfo}>Sedang diproses Admin SDM sejak {tanggal(sejakDiproses.pada)}.</div>}
            {d.status === "draf" && <div className={s.kotakInfo}>Pengajuan ini masih draf dan belum dikirim.</div>}

            {d.status === "selesai" && (
              <>
                <div className={s.nominal}>
                  <small>Nominal disetujui</small>
                  <strong>{rupiah(d.nominal)}</strong>
                  <small>
                    Disetujui {terakhir ? tanggal(terakhir.pada) : ""} · {1 + d.tad.length} rincian
                  </small>
                </div>
                {[{ id: "karyawan", nama: p.namaPengguna, label: "", nominal: String(d.rincian.reduce((n, r) => n + r.nominal, 0)), rincian: d.rincian }, ...d.tad.map((t) => ({ ...t, label: "TAD" }))].map((o) => (
                  <section key={o.id} className={s.blok}>
                    <div className={s.kepalaBlok}>
                      <span>
                        {o.nama} {o.label && <span className={s.lencanaKecil}>{o.label}</span>}
                      </span>
                      <span>{rupiah(o.nominal)}</span>
                    </div>
                    {o.rincian.map((r) => (
                      <div key={r.label} className={s.barisNominal}>
                        <span>{r.label}</span>
                        <span>{rupiah(r.nominal)}</span>
                      </div>
                    ))}
                  </section>
                ))}
              </>
            )}

            {d.riwayat.length > 0 && (
              <section className={s.blok}>
                <div className={s.kepalaBlok}>Riwayat status</div>
                <ol className={s.linimasa}>
                  {[...d.riwayat].reverse().map((r, i) => (
                    <li key={i}>
                      <strong>{r.catatan === "Dikirim ulang" ? "Dikirim ulang" : LABEL_STATUS[r.status]}</strong>
                      <span>
                        {waktuPendek(r.pada)} · {r.oleh}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <section className={s.blok}>
              <div className={s.kepalaBlok}>Ringkasan</div>
              <dl className={s.ringkas}>
                <ButirIsian jenis={d.jenis} isian={d.isian} />
              </dl>
            </section>

            {d.tad.length > 0 && (
              <section className={s.blok}>
                <div className={s.kepalaBlok}>TAD dalam {konfig(d.jenis).surat} ini ({d.tad.length})</div>
                {d.tad.map((t) => (
                  <div key={t.id} className={s.teksKecil}>
                    <b>{t.nama}</b> · {[t.nik, t.vendor].filter(Boolean).join(" · ") || "data belum lengkap"}
                  </div>
                ))}
              </section>
            )}

            {d.dokumen.length > 0 && (
              <section className={s.blok}>
                <div className={s.kepalaBlok}>Dokumen</div>
                {d.dokumen.map((f) => (
                  <div key={f.id} className={s.barisNominal}>
                    <span>
                      {namaDokumen(d.jenis, f.jenis)} · {ukuran(f.ukuran)}
                    </span>
                    <button type="button" className={s.tautan} onClick={() => void unduhDok(f.id)}>
                      Unduh
                    </button>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </div>
      {d && (d.bisaEdit || d.bisaBatal) && (
        <div className={s.bawah}>
          {d.bisaEdit && (
            <button type="button" className={`${ui.tombol} ${ui.utama} ${ui.penuh}`} onClick={() => p.onEdit(d)}>
              {d.status === "draf" ? "Lanjutkan draf" : "Edit dan kirim ulang"}
            </button>
          )}
          {d.bisaBatal && (
            <button type="button" className={`${ui.tombol} ${ui.bahaya} ${ui.penuh}`} onClick={() => setBatal(true)}>
              Batalkan pengajuan
            </button>
          )}
        </div>
      )}
      {batal && d && (
        <DialogBatal
          nomor={d.nomor}
          onTutup={(dibatalkan) => {
            setBatal(false);
            if (dibatalkan) p.onKembali(true);
          }}
        />
      )}
    </div>
  );
}

/** Dialog konfirmasi batalkan (Design Brief 6: tombol menyebut tindakannya). */
function DialogBatal(p: { nomor: string; onTutup: (dibatalkan: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState("");
  useEffect(() => ref.current?.showModal(), []);

  return (
    <dialog ref={ref} className={s.dialog} onClose={() => p.onTutup(false)} aria-labelledby="judul-batal">
      <h2 id="judul-batal">Batalkan pengajuan {p.nomor}?</h2>
      <p>Pengajuan yang dibatalkan tidak dapat dikirim ulang. Buat pengajuan baru bila diperlukan.</p>
      {galat && (
        <p className={s.pesanGalat} role="alert">
          {galat}
        </p>
      )}
      <div className={s.tombolKolom}>
        <button
          type="button"
          className={`${ui.tombol} ${s.tombolBahaya} ${ui.penuh}`}
          disabled={memuat}
          onClick={async () => {
            setMemuat(true);
            try {
              await panggil("batalkanPengajuan", { nomor: p.nomor });
              p.onTutup(true);
            } catch (e) {
              setGalat((e as Error).message);
              setMemuat(false);
            }
          }}
        >
          {memuat ? <span className={ui.putar} aria-hidden /> : "Batalkan pengajuan"}
        </button>
        <button type="button" className={`${ui.tombol} ${ui.sekunder} ${ui.penuh}`} disabled={memuat} onClick={() => ref.current?.close()}>
          Kembali
        </button>
      </div>
    </dialog>
  );
}
