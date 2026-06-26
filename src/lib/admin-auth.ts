import "server-only";

import { NextResponse } from "next/server";
import { getActiveSessionUser } from "@/lib/auth-session";
import { isAdminEmail, isSuperAdminEmail } from "@/lib/admin-emails";
import { hasValidAdminPortalSession } from "@/lib/admin-portal-auth";

export { isAdminEmail, isSuperAdminEmail } from "@/lib/admin-emails";

export async function assertSuperAdminIdentity(request?: Request) {
  const user = await getActiveSessionUser(request);

  if (!user?.email) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "SuperAdmin erişimi için oturum açmanız gerekiyor.",
        },
        { status: 401 },
      ),
    };
  }

  if (!isSuperAdminEmail(user.email)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: "Bu alana erişim yetkiniz yok." },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true as const,
    user,
  };
}

export async function assertSuperAdminAccess(request?: Request) {
  const identity = await assertSuperAdminIdentity(request);
  if (!identity.ok) {
    return identity;
  }

  if (!(await hasValidAdminPortalSession(identity.user.email!))) {
    return {
      ok: false as const,
      needsPortalAuth: true as const,
      response: NextResponse.json(
        {
          success: false,
          error: "SuperAdmin portal şifresi gerekli.",
          needsPortalAuth: true,
        },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true as const,
    user: identity.user,
  };
}

export async function assertAdminAccess(request?: Request) {
  const user = await getActiveSessionUser(request);

  if (!user?.email) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: "Admin erişimi için oturum açmanız gerekiyor." },
        { status: 401 },
      ),
    };
  }

  if (!isAdminEmail(user.email, process.env.ADMIN_EMAILS)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: "Bu alana erişim yetkiniz yok." },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true as const,
    user,
  };
}
