/**
 * Supabase prod DB Prisma dışında oluşturulduysa:
 * 1) Eksik kolonları idempotent SQL ile uygular
 * 2) Tüm mevcut migration'ları "applied" olarak baseline eder
 * 3) prisma migrate deploy ile kalanları uygular
 *
 * Kullanım: npm run db:migrate:deploy
 */
import { config } from "dotenv";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "../prisma/migrations");
const hotfixPath = join(__dirname, "supabase-prod-schema-hotfix.sql");

function listMigrationNames() {
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function runPrisma(args, { capture = false } = {}) {
  return spawnSync("npx", ["prisma", ...args], {
    stdio: capture ? "pipe" : "inherit",
    encoding: capture ? "utf8" : undefined,
    env: {
      ...process.env,
      DATABASE_URL: directUrl,
      DIRECT_URL: directUrl,
    },
    shell: true,
  });
}

function createPgClient() {
  return new pg.Client({
    connectionString: directUrl,
    ssl: directUrl.includes("supabase.com")
      ? { rejectUnauthorized: false }
      : undefined,
  });
}

async function tableExists(client, tableName) {
  const result = await client.query(
    `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = $1
      LIMIT 1
    `,
    [tableName],
  );
  return result.rowCount > 0;
}

async function getAppliedMigrationCount(client) {
  if (!(await tableExists(client, "_prisma_migrations"))) {
    return 0;
  }

  const result = await client.query(
    `SELECT COUNT(*)::int AS count FROM "_prisma_migrations"`,
  );
  return result.rows[0]?.count ?? 0;
}

async function applySchemaHotfix(client) {
  const sql = readFileSync(hotfixPath, "utf8");
  console.log("Eksik kolonlar uygulanıyor (supabase-prod-schema-hotfix.sql)...");
  await client.query(sql);
}

async function reloadPostgrestSchema(client) {
  await client.query(`NOTIFY pgrst, 'reload schema';`);
}

async function needsBaseline(client) {
  const hasCampaign = await tableExists(client, "Campaign");
  if (!hasCampaign) {
    return false;
  }

  const appliedCount = await getAppliedMigrationCount(client);
  return appliedCount === 0;
}

async function baselineExistingDatabase() {
  const migrationNames = listMigrationNames();
  console.log(
    `P3005 baseline: ${migrationNames.length} migration "applied" olarak işaretlenecek.`,
  );

  for (const migrationName of migrationNames) {
    const result = runPrisma(["migrate", "resolve", "--applied", migrationName], {
      capture: true,
    });

    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    if (result.status !== 0) {
      if (output.includes("already recorded as applied")) {
        continue;
      }

      console.error(`Baseline başarısız (${migrationName}):`, output.trim());
      process.exit(result.status ?? 1);
    }

    console.log(`  ✓ ${migrationName}`);
  }
}

async function main() {
  const client = createPgClient();
  await client.connect();

  try {
    const shouldBaseline = await needsBaseline(client);

    if (shouldBaseline) {
      console.log(
        "Mevcut Supabase şeması tespit edildi; Prisma migration geçmişi yok (P3005).",
      );
      await applySchemaHotfix(client);
      await reloadPostgrestSchema(client);
      await client.end();
      await baselineExistingDatabase();
    } else {
      await client.end();
    }
  } catch (error) {
    await client.end().catch(() => undefined);
    throw error;
  }

  console.log("Prisma migrate deploy (DIRECT_URL)...");
  const migrate = runPrisma(["migrate", "deploy"], { capture: true });
  const migrateOutput = `${migrate.stdout ?? ""}${migrate.stderr ?? ""}`;

  if (migrate.status !== 0) {
    if (migrateOutput.includes("P3005")) {
      console.log("P3005 — baseline akışı tekrar deneniyor...");
      const retryClient = createPgClient();
      await retryClient.connect();
      try {
        await applySchemaHotfix(retryClient);
        await reloadPostgrestSchema(retryClient);
      } finally {
        await retryClient.end();
      }

      await baselineExistingDatabase();

      const retry = runPrisma(["migrate", "deploy"]);
      if (retry.status !== 0) {
        process.exit(retry.status ?? 1);
      }
    } else {
      if (migrateOutput.trim()) {
        console.error(migrateOutput.trim());
      }
      process.exit(migrate.status ?? 1);
    }
  } else if (migrateOutput.trim()) {
    console.log(migrateOutput.trim());
  }

  const cacheClient = createPgClient();
  try {
    await cacheClient.connect();
    await reloadPostgrestSchema(cacheClient);
    console.log("Migration tamam. Supabase API cache yenilendi.");
  } catch (error) {
    console.warn(
      "NOTIFY pgrst başarısız. Supabase Dashboard → Settings → API → Reload schema cache.",
      error,
    );
  } finally {
    await cacheClient.end();
  }

  if (databaseUrl && databaseUrl !== directUrl) {
    console.log(
      "Not: Uygulama DATABASE_URL (pooler) kullanmaya devam eder; migration için DIRECT_URL kullanıldı.",
    );
  }
}

main().catch((error) => {
  console.error("Migration deploy başarısız:", error);
  process.exit(1);
});
