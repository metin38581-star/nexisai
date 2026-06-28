import { NextResponse } from "next/server";

import {
  STANDALONE_ADMIN_COOKIE,
  buildStandaloneAdminCookieOptions,
  createStandaloneAdminSessionValue,
  hasValidStandaloneAdminSession,
} from "@/lib/standalone-admin-auth";
import {
  getStandaloneAdminAuthReadiness,
  verifyStandaloneAdminPassword,
} from "@/lib/standalone-admin-password";
import { checkRateLimit } from "@/lib/rate-limit";
import { handleApiRouteError } from "@/lib/api-error";

function resolveClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwarded || realIp || "unknown";
}

export async function GET() {
  try {
    const authenticated = await hasValidStandaloneAdminSession();

    return NextResponse.json({
      success: authenticated,
      authenticated,
    });
  } catch (error) {
    return handleApiRouteError(error, "Admin oturumu doğrulanamadı.");
  }
}

export async function POST(request: Request) {
  try {
    const authReadiness = getStandaloneAdminAuthReadiness();
    if (!authReadiness.passwordConfigured) {
      return NextResponse.json(
        {
          success: false,
          error: "Admin girişi yapılandırılmamış. ADMIN_STANDALONE_PASSWORD tanımlayın.",
        },
        { status: 503 },
      );
    }

    if (!authReadiness.secretConfigured) {
      return NextResponse.json(
        {
          success: false,
          error: "Admin oturum imzası yapılandırılmamış. ADMIN_STANDALONE_SECRET tanımlayın.",
        },
        { status: 503 },
      );
    }

    const rateLimit = checkRateLimit(
      `admin-panel-om:${resolveClientKey(request)}`,
      8,
      15 * 60 * 1000,
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Çok fazla deneme. Lütfen bir süre sonra tekrar deneyin.",
        },
        { status: 429 },
      );
    }

    const body = (await request.json()) as { password?: string };
    const incomingPassword = (body.password ?? "").trim();

    if (!verifyStandaloneAdminPassword(incomingPassword)) {
      return NextResponse.json(
        { success: false, error: "Geçersiz admin şifresi." },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ success: true, authenticated: true });
    response.cookies.set(
      STANDALONE_ADMIN_COOKIE,
      createStandaloneAdminSessionValue(),
      buildStandaloneAdminCookieOptions(),
    );

    return response;
  } catch (error) {
    return handleApiRouteError(error, "Admin girişi başarısız.");
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, authenticated: false });
  response.cookies.set(STANDALONE_ADMIN_COOKIE, "", {
    ...buildStandaloneAdminCookieOptions(),
    maxAge: 0,
  });

  return response;
}
