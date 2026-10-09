import { defineConfig } from "vitest/config";

// Tes login dan hak akses butuh database hcs-dev (laptop) atau Postgres CI. Tanpa DATABASE_URL, tes itu dilewati.
try {
  process.loadEnvFile(new URL("../.env", import.meta.url));
} catch {}

export default defineConfig({ test: { testTimeout: 30_000, fileParallelism: false } });
