import "server-only";

import { NextResponse } from "next/server";
import { getActiveSessionUser } from "@/lib/auth-session";
import { isAdminEmail } from "@/lib/admin-emails";

export { isAdminEmail } from "@/lib/admin-emails";

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
