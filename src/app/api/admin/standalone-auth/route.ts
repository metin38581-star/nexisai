import { NextResponse } from "next/server";

import {
  STANDALONE_ADMIN_COOKIE,
  buildStandaloneAdminCookieOptions,
  createStandaloneAdminSessionValue,
  hasValidStandaloneAdminSession,
  verifyStandaloneAdminPassword,
} from "@/lib/standalone-admin-auth";
import { handleApiRouteError } from "@/lib/api-error";

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
    const body = (await request.json()) as { password?: string };
    const password = body.password ?? "";

    if (!verifyStandaloneAdminPassword(password)) {
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
