/**
 * QuestionHub / HubAnswer tablolarini Prisma migrate yerine dogrudan SQL ile uygular.
 * Supabase pooler (6543) migrate'i askida birakir — DIRECT_URL veya session modu (5432) kullanin.
 *
 * Kullanım: node scripts/ensure-question-hub-tables.mjs
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

config({ path: ".env.local" });
config({ path: ".env" });

const connectionString =
  process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();

if (!connectionString) {
  console.error("[QUESTION_HUB_DDL] DATABASE_URL veya DIRECT_URL tanımlı değil.");
  process.exit(1);
}

if (
  connectionString.includes("pooler.supabase.com:6543") &&
  !process.env.DIRECT_URL?.trim()
) {
  console.warn(
    "[QUESTION_HUB_DDL] UYARI: 6543 transaction pooler migrate icin uygun degil.",
  );
  console.warn(
    "[QUESTION_HUB_DDL] .env.local icinde DIRECT_URL=postgresql://...@db.<ref>.supabase.co:5432/postgres kullanin.",
  );
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(
  __dirname,
  "../prisma/migrations/20260624120000_question_hub/migration.sql",
);
const sql = readFileSync(sqlPath, "utf8");

const client = new pg.Client({
  connectionString,
  ssl: connectionString.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : undefined,
  connectionTimeoutMillis: 15_000,
});

const connectTimeout = setTimeout(() => {
  console.error(
    "[QUESTION_HUB_DDL] Baglanti 15sn icinde kurulamadi — pooler kilidi olabilir.",
  );
  console.error(
    "[QUESTION_HUB_DDL] Once: powershell -File scripts/kill-stale-db-processes.ps1",
  );
  process.exit(1);
}, 15_000);

try {
  await client.connect();
  clearTimeout(connectTimeout);

  await client.query("SET statement_timeout = '45s'");
  await client.query(sql);

  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('QuestionHub', 'HubAnswer')
    ORDER BY table_name
  `);

  console.log(
    "[QUESTION_HUB_DDL] Tablolar:",
    tables.rows.map((row) => row.table_name).join(", ") || "(bulunamadi)",
  );
} catch (error) {
  console.error("[QUESTION_HUB_DDL] Hata:", error);
  process.exitCode = 1;
} finally {
  clearTimeout(connectTimeout);
  await client.end().catch(() => undefined);
}

if (process.exitCode === 0 || process.exitCode === undefined) {
  console.log("[QUESTION_HUB_DDL] QuestionHub mimarisi uygulandi.");
}
