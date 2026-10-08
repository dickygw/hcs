/**
 * npm run cek:rls — pemeriksaan kunci database (AI-02). Gagal (kode keluar 1) bila:
 * - ada tabel di skema public,
 * - ada tabel di skema hcs tanpa RLS aktif + dipaksa,
 * - ada policy apa pun (HCS memakai RLS tolak semua tanpa policy),
 * - anon/authenticated punya hak pada skema atau tabel hcs/public,
 * - hcs_app terlalu berkuasa (superuser, pemilik tabel, atau bisa DELETE/UPDATE tabel log).
 */
import pg from "pg";
import { opsiKoneksi } from "./koneksi.js";

const TABEL_LOG = ["riwayat_status", "log_perubahan", "log_akses_rekening", "riwayat_sinkronisasi"];

const pemeriksaan: { judul: string; sql: string; params?: unknown[] }[] = [
  {
    judul: "Tabel di skema public",
    sql: `SELECT c.relname AS nama FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'f')`,
  },
  {
    judul: "Tabel hcs tanpa RLS aktif dan dipaksa",
    sql: `SELECT c.relname AS nama FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'hcs' AND c.relkind IN ('r', 'p')
            AND NOT (c.relrowsecurity AND c.relforcerowsecurity)`,
  },
  {
    judul: "View di skema hcs (dilarang tanpa security_invoker, SUPA-12)",
    sql: `SELECT c.relname AS nama FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'hcs' AND c.relkind IN ('v', 'm')
            AND NOT coalesce(c.reloptions @> ARRAY['security_invoker=true'], false)`,
  },
  {
    judul: "Policy yang membuka akses",
    sql: `SELECT schemaname || '.' || tablename || ' / ' || policyname AS nama FROM pg_policies
          WHERE schemaname IN ('hcs', 'public')`,
  },
  {
    judul: "Hak anon/authenticated pada skema hcs",
    sql: `SELECT r AS nama FROM unnest(ARRAY['anon', 'authenticated']) r
          WHERE EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r)
            AND has_schema_privilege(r, 'hcs', 'USAGE')`,
  },
  {
    judul: "Hak anon/authenticated pada tabel",
    sql: `SELECT r || ' → ' || n.nspname || '.' || c.relname AS nama
          FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace,
               unnest(ARRAY['anon', 'authenticated']) r
          WHERE n.nspname IN ('hcs', 'public') AND c.relkind IN ('r', 'p', 'v', 'm')
            AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r)
            AND has_table_privilege(r, c.oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE')`,
  },
  {
    judul: "Function SECURITY DEFINER di skema hcs/public (SUPA-12)",
    sql: `SELECT n.nspname || '.' || p.proname AS nama FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname IN ('hcs', 'public') AND p.prosecdef`,
  },
  {
    judul: "Peran hcs_app terlalu berkuasa",
    sql: `SELECT 'superuser/createrole/createdb' AS nama FROM pg_roles
          WHERE rolname = 'hcs_app' AND (rolsuper OR rolcreaterole OR rolcreatedb)
          UNION ALL
          SELECT 'pemilik ' || c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'hcs' AND pg_get_userbyid(c.relowner) = 'hcs_app'
          UNION ALL
          SELECT 'bisa DELETE ' || c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'hcs' AND c.relkind = 'r' AND has_table_privilege('hcs_app', c.oid, 'DELETE, TRUNCATE')
          UNION ALL
          SELECT 'bisa UPDATE log ' || t FROM unnest($1::text[]) t
          WHERE has_table_privilege('hcs_app', 'hcs.' || t, 'UPDATE')`,
    params: [TABEL_LOG],
  },
];

const client = new pg.Client(opsiKoneksi("DATABASE_URL"));
await client.connect();

let gagal = 0;
try {
  const jumlah = await client.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'hcs' AND c.relkind = 'r'`,
  );
  console.log(`Memeriksa ${jumlah.rows[0]?.n ?? 0} tabel di skema hcs.\n`);

  for (const p of pemeriksaan) {
    const { rows } = await client.query<{ nama: string }>(p.sql, p.params);
    if (rows.length === 0) {
      console.log(`  LOLOS  ${p.judul}`);
    } else {
      gagal++;
      console.log(`  GAGAL  ${p.judul}: ${rows.map((r) => r.nama).join(", ")}`);
    }
  }
} finally {
  await client.end();
}

console.log(gagal ? `\n${gagal} pemeriksaan GAGAL.` : "\nSemua pemeriksaan lolos.");
process.exit(gagal ? 1 : 0);
