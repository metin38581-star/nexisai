import "server-only";

export interface ServerEnvStatus {
  databaseUrl: boolean;
  supabaseUrl: boolean;
  supabaseAnonKey: boolean;
  supabaseServiceRoleKey: boolean;
}

let envStatusLogged = false;

export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function hasSupabaseAdminEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

export function checkServerEnv(): ServerEnvStatus {
  return {
    databaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
    supabaseServiceRoleKey: Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
    ),
  };
}

export function logServerEnvStatus(context = "init"): void {
  if (envStatusLogged) {
    return;
  }

  envStatusLogged = true;
  const status = checkServerEnv();

  console.log(`[SERVER_ENV:${context}]`, {
    DATABASE_URL: status.databaseUrl ? "ok" : "MISSING",
    NEXT_PUBLIC_SUPABASE_URL: status.supabaseUrl ? "ok" : "MISSING",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: status.supabaseAnonKey ? "ok" : "MISSING",
    SUPABASE_SERVICE_ROLE_KEY: status.supabaseServiceRoleKey
      ? "ok"
      : "MISSING",
  });

  if (!status.databaseUrl && !hasSupabaseAdminEnv()) {
    console.error(
      "[SERVER_ENV] DATABASE_URL ve Supabase service role birlikte eksik; API rotaları çalışmayabilir.",
    );
  }

  if (!status.supabaseUrl) {
    console.error(
      "[SERVER_ENV] Supabase Auth için NEXT_PUBLIC_SUPABASE_URL tanımlı değil.",
    );
  }

  if (!status.supabaseServiceRoleKey) {
    console.warn(
      "[SERVER_ENV] SUPABASE_SERVICE_ROLE_KEY eksik; admin işlemleri devre dışı kalabilir.",
    );
  }
}

export function assertDatabaseEnv(): void {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL ortam değişkeni tanımlı değil.");
  }
}

export function isDatabaseOrConfigError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  if (
    message.includes("database_url") ||
    message.includes("supabase yapılandırması") ||
    message.includes("veritabanı bağlantı") ||
    message.includes("service role eksik")
  ) {
    return true;
  }

  const prismaCode =
    "code" in error && typeof error.code === "string" ? error.code : null;

  if (prismaCode?.startsWith("P1")) {
    return true;
  }

  return (
    message.includes("econnrefused") ||
    message.includes("connection terminated") ||
    message.includes("password authentication failed") ||
    message.includes("getaddrinfo enotfound")
  );
}
