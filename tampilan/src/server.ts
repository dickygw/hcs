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

export function panggil<T>(nama: string, arg?: unknown): Promise<T> {
  return new Promise((ok, gagal) =>
    google.script.run
      .withSuccessHandler((h) => ok(h as T))
      .withFailureHandler(gagal)
      .api(nama, arg),
  );
}
