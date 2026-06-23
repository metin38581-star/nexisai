/**
 * Tüm GEO kampanyalarını ve kayıtlı işletme (deneme) kayıtlarını siler.
 * Kullanıcı cüzdanları korunur; Payment.campaignId null yapılır.
 *
 * Kullanım: node scripts/purge-all-businesses.mjs
 */
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });
config({ path: ".env" });

const connectionString =
  process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();

if (!connectionString) {
  console.error("DATABASE_URL veya DIRECT_URL tanımlı değil.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: connectionString.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : undefined,
});

async function tableExists(tableName) {
  const result = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName],
  );
  return result.rowCount > 0;
}

async function countRows(tableName) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS count FROM "${tableName}"`,
  );
  return result.rows[0]?.count ?? 0;
}

const DELETE_ORDER = [
  "CampaignIntent",
  "Bait",
  "CampaignRadarLog",
  "CampaignGrowthLoop",
  "Campaign",
  "RegisteredBusiness",
];

await client.connect();

try {
  await client.query("BEGIN");

  const existingTables = [];
  for (const table of DELETE_ORDER) {
    if (await tableExists(table)) {
      existingTables.push(table);
    }
  }

  const before = {};
  for (const table of existingTables) {
    before[table] = await countRows(table);
  }

  console.log("Silinmeden önce:", before);

  if (await tableExists("Payment")) {
    await client.query(
      `UPDATE "Payment" SET "campaignId" = NULL WHERE "campaignId" IS NOT NULL`,
    );
  }

  for (const table of existingTables) {
    const deleted = await client.query(`DELETE FROM "${table}"`);
    console.log(`  ${table}: ${deleted.rowCount ?? 0} satır silindi`);
  }

  await client.query("COMMIT");
  console.log("Tamamlandı.");
} catch (error) {
  await client.query("ROLLBACK");
  console.error("Hata:", error);
  process.exit(1);
} finally {
  await client.end();
}
