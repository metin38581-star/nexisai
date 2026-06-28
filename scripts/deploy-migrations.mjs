/**
 * Production / staging: pending Prisma migrations uygular.
 * DIRECT_URL (5432) zorunlu — pooler (6543) migration için uygun değil.
 *
 * Kullanım: .env.local içinde DIRECT_URL tanımlı iken
 *   npm run db:migrate:deploy
 */
import { config } from "dotenv";
import { spawnSync } from "node:child_process";
import pg from "pg";

config({ path: ".env.local" });
config();

const directUrl = process.env.DIRECT_URL?.trim();
const databaseUrl = process.env.DATABASE_URL?.trim();

if (!directUrl) {
  console.error(
    "DIRECT_URL tanımlı değil. Supabase → Database → Connection string → Session mode (5432).",
  );
  process.exit(1);
}

console.log("Prisma migrate deploy (DIRECT_URL)...");
const migrate = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: directUrl,
    DIRECT_URL: directUrl,
  },
  shell: true,
});

if (migrate.status !== 0) {
  process.exit(migrate.status ?? 1);
}

console.log("PostgREST schema cache yenileniyor...");
const client = new pg.Client({
  connectionString: directUrl,
  ssl: directUrl.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : undefined,
});

try {
  await client.connect();
  await client.query(`NOTIFY pgrst, 'reload schema';`);
  console.log("Migration tamam. Supabase API cache yenilendi.");
} catch (error) {
  console.warn(
    "NOTIFY pgrst başarısız (migration yine de uygulandı). Supabase Dashboard → Settings → API → Reload schema cache.",
    error,
  );
} finally {
  await client.end();
}

if (databaseUrl && databaseUrl !== directUrl) {
  console.log(
    "Not: Uygulama DATABASE_URL (pooler) kullanmaya devam eder; migration için DIRECT_URL kullanıldı.",
  );
}
