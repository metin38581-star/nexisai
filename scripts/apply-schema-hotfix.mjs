/**
 * Prod / staging: Campaign.status P2022 hatası için idempotent SQL.
 * DIRECT_URL gerekir (.env.local).
 *
 * Kullanım: npm run db:schema:hotfix
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

config({ path: ".env.local" });
config();

const directUrl = process.env.DIRECT_URL?.trim();

if (!directUrl) {
  console.error("DIRECT_URL tanımlı değil.");
  process.exit(1);
}

const hotfixPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "supabase-prod-schema-hotfix.sql",
);

const client = new pg.Client({
  connectionString: directUrl,
  ssl: directUrl.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : undefined,
});

try {
  await client.connect();
  const sql = readFileSync(hotfixPath, "utf8");
  console.log("Hotfix SQL uygulanıyor...");
  await client.query(sql);
  console.log("Tamam. Supabase → Settings → API → Reload schema (gerekirse).");
} catch (error) {
  console.error("Hotfix başarısız:", error);
  process.exit(1);
} finally {
  await client.end();
}
