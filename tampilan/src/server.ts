// Pemanggil fungsi server Apps Script. Semua permintaan lewat satu pintu: google.script.run.api.

declare const google: {
  script: {
    run: {
      withSuccessHandler(fn: (hasil: unknown) => void): {
        withFailureHandler(fn: (galat: Error) => void): { api(nama: string, arg?: unknown): void };
      };
    };
  };
};

export const DIAM_MAKS_MS = 15 * 60 * 1000; // sama dengan server (AUTH-05)
export const EVENT_SESI_BERAKHIR = "hcs:sesi-berakhir";

let aktivitasTerakhir = Date.now();
export const diamSejak = () => aktivitasTerakhir;

/** Galat dari server. kode diambil dari awalan "[kode] pesan" (mis. sesi_berakhir). */
export class GalatServer extends Error {
  constructor(
    pesan: string,
    readonly kode: string,
  ) {
    super(pesan);
  }
}

export function panggil<T>(nama: string, arg?: unknown): Promise<T> {
  aktivitasTerakhir = Date.now();
  return new Promise((ok, gagal) =>
    google.script.run
      .withSuccessHandler((h) => ok(h as T))
      .withFailureHandler((e) => {
        const cocok = /^\[(\w+)\]\s*(.*)$/s.exec(String(e?.message ?? ""));
        const galat = cocok ? new GalatServer(cocok[2]!, cocok[1]!) : new GalatServer(String(e?.message || "Koneksi terputus."), "");
        if (galat.kode === "sesi_berakhir") window.dispatchEvent(new Event(EVENT_SESI_BERAKHIR));
        gagal(galat);
      })
      .api(nama, arg),
  );
}
