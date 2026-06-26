import "server-only";

import { NextResponse } from "next/server";
import { getActiveSessionUser } from "@/lib/auth-session";
import { isAdminEmail, isSuperAdminEmail } from "@/lib/admin-emails";
import { hasValidStandaloneAdminSession } from "@/lib/standalone-admin-auth";

export { isAdminEmail, isSuperAdminEmail } from "@/lib/admin-emails";

export async function assertStandaloneAdminAccess() {
  if (!(await hasValidStandaloneAdminSession())) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "Admin oturumu gerekli.",
          needsLogin: true,
        },
        { status: 401 },
      ),
    };
  }

  return {
    ok: true as const,
  };
}

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

export async function assertSuperAdminAccess() {
  return assertStandaloneAdminAccess();
}

export async function assertAdminAccess(request?: Request) {
  if (await hasValidStandaloneAdminSession()) {
    return {
      ok: true as const,
      user: null,
    };
  }

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
