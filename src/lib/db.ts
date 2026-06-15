import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

import { assertDatabaseEnv, logServerEnvStatus } from "@/lib/server-env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

function createPgPool(connectionString: string): Pool {
  const isSupabase = connectionString.includes("supabase.com");
  const isProduction = process.env.NODE_ENV === "production";

  return new Pool({
    connectionString,
    max: isProduction ? 1 : 5,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
    ...(isSupabase || isProduction
      ? { ssl: { rejectUnauthorized: false } }
      : {}),
  });
}

function createPrismaClient(): PrismaClient {
  logServerEnvStatus("prisma");
  assertDatabaseEnv();

  const connectionString = process.env.DATABASE_URL!.trim();

  if (!globalForPrisma.pgPool) {
    globalForPrisma.pgPool = createPgPool(connectionString);
  }

  const adapter = new PrismaPg(globalForPrisma.pgPool);

  return new PrismaClient({ adapter });
}

export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

/**
 * Lazy Prisma proxy — modül import edildiğinde DATABASE_URL yoksa çökmez;
 * ilk sorguda hata fırlatır ve route try-catch bloğu yakalar.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, client);

    if (typeof value === "function") {
      return value.bind(client);
    }

    return value;
  },
});
