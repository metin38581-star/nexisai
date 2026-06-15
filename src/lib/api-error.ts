import "server-only";

import { NextResponse } from "next/server";

import { isDatabaseOrConfigError, hasDatabaseUrl, hasSupabaseAdminEnv } from "@/lib/server-env";

export function assertDataAccessEnv(): void {
  if (!hasDatabaseUrl() && !hasSupabaseAdminEnv()) {
    throw new Error(
      "Veritabanı bağlantı hatası: DATABASE_URL veya Supabase service role eksik.",
    );
  }
}

export function handleApiRouteError(
  error: unknown,
  fallbackMessage = "İşlem sırasında bir hata oluştu.",
): NextResponse {
  console.error("API Hatası:", error);

  if (isDatabaseOrConfigError(error)) {
    return NextResponse.json(
      { success: false, error: "Veritabanı bağlantı hatası" },
      { status: 500 },
    );
  }

  const message = error instanceof Error ? error.message : fallbackMessage;

  return NextResponse.json(
    { success: false, error: message },
    { status: 500 },
  );
}
