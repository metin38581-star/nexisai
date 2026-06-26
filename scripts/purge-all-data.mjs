/**
 * Tüm kullanıcı kayıtları, kampanyalar, içerikler ve yayınları siler.
 *
 * Kullanım: node scripts/purge-all-data.mjs --confirm
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

config({ path: ".env.local" });
config({ path: ".env" });

const confirmed = process.argv.includes("--confirm");
if (!confirmed) {
  console.error("Onay gerekli: node scripts/purge-all-data.mjs --confirm");
  process.exit(1);
}

const connectionString =
  process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!connectionString) {
  console.error("DATABASE_URL veya DIRECT_URL tanımlı değil.");
  process.exit(1);
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Supabase yapılandırması eksik: NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.",
  );
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: connectionString.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : undefined,
});

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
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
  "HubAnswer",
  "CampaignIntent",
  "Bait",
  "CampaignRadarLog",
  "CampaignGrowthLoop",
  "CampaignLog",
  "Payment",
  "Campaign",
  "QuestionHub",
  "RegisteredBusiness",
  "Wallet",
  "OtpVerification",
  "IyzicoCheckout",
];

async function purgeDatabase() {
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
    console.log("Veritabanı — silinmeden önce:", before);

    for (const table of existingTables) {
      const deleted = await client.query(`DELETE FROM "${table}"`);
      console.log(`  ${table}: ${deleted.rowCount ?? 0} satır silindi`);
    }

    await client.query("COMMIT");
    console.log("Veritabanı temizliği tamamlandı.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

async function purgeAuthUsers() {
  let page = 1;
  const perPage = 200;
  let deleted = 0;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    if (data.users.length === 0) {
      break;
    }

    for (const user of data.users) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(
        user.id,
      );
      if (deleteError) {
        console.error(`  Auth kullanıcı silinemedi (${user.email}):`, deleteError.message);
        continue;
      }
      deleted += 1;
      console.log(`  Auth kullanıcı silindi: ${user.email ?? user.id}`);
    }

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  console.log(`Supabase Auth — toplam ${deleted} kullanıcı silindi.`);
}

try {
  await purgeDatabase();
  await purgeAuthUsers();
  console.log("Tüm kayıtlar, içerikler ve kullanıcılar silindi.");
} catch (error) {
  console.error("Hata:", error);
  process.exit(1);
}
