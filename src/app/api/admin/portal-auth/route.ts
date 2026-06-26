import { NextResponse } from "next/server";

import { assertSuperAdminIdentity } from "@/lib/admin-auth";
import {
  ADMIN_PORTAL_COOKIE,
  buildAdminPortalCookieOptions,
  createAdminPortalSessionValue,
  isAdminPortalPasswordRequired,
  verifyAdminPortalPassword,
  hasValidAdminPortalSession,
} from "@/lib/admin-portal-auth";
import { handleApiRouteError } from "@/lib/api-error";

export async function GET(request: Request) {
  try {
    const identity = await assertSuperAdminIdentity(request);
    if (!identity.ok) {
      return identity.response;
    }

    const portalVerified = await hasValidAdminPortalSession(identity.user.email!);

    return NextResponse.json({
      success: portalVerified,
      verified: portalVerified,
      needsPortalAuth: !portalVerified && isAdminPortalPasswordRequired(),
      passwordRequired: isAdminPortalPasswordRequired(),
    });
  } catch (error) {
    return handleApiRouteError(error, "Portal oturumu doğrulanamadı.");
  }
}

export async function POST(request: Request) {
  try {
    const identity = await assertSuperAdminIdentity(request);
    if (!identity.ok) {
      return identity.response;
    }

    const body = (await request.json()) as { password?: string };
    const password = body.password?.trim() ?? "";

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Portal şifresi zorunludur." },
        { status: 400 },
      );
    }

    const isValid = await verifyAdminPortalPassword(password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Geçersiz SuperAdmin portal şifresi." },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ success: true, verified: true });
    response.cookies.set(
      ADMIN_PORTAL_COOKIE,
      createAdminPortalSessionValue(identity.user.email!),
      buildAdminPortalCookieOptions(),
    );

    return response;
  } catch (error) {
    return handleApiRouteError(error, "Portal girişi başarısız.");
  }
}
