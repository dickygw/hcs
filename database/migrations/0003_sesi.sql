-- 0003 Tabel sesi login (AUTH-04 s.d. AUTH-06).
-- Token sesi hanya ada di cookie browser; database menyimpan hash SHA-256-nya.
-- Sesi tidak dihapus: keluar dan kedaluwarsa ditandai lewat kolom dicabut_pada,
-- karena hcs_app tidak boleh DELETE di tabel mana pun.

CREATE TABLE hcs.sesi (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  token_hash          text NOT NULL UNIQUE CHECK (length(token_hash) = 64),
  pengguna_id         bigint NOT NULL REFERENCES hcs.pengguna (id),
  csrf_token          text NOT NULL,
  dibuat_pada         timestamptz NOT NULL DEFAULT now(),
  aktivitas_terakhir  timestamptz NOT NULL DEFAULT now(),
  kedaluwarsa_pada    timestamptz NOT NULL,
  dicabut_pada        timestamptz
);
CREATE INDEX sesi_pengguna_idx ON hcs.sesi (pengguna_id);

ALTER TABLE hcs.sesi ENABLE ROW LEVEL SECURITY;
ALTER TABLE hcs.sesi FORCE ROW LEVEL SECURITY;
REVOKE ALL ON hcs.sesi FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON hcs.sesi TO hcs_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA hcs TO hcs_app;
