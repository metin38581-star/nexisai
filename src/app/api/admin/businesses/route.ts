import { NextResponse } from "next/server";

import { assertAdminAccess } from "@/lib/admin-auth";
import { listAdminBusinesses } from "@/lib/admin-store";
import { handleApiRouteError } from "@/lib/api-error";

export async function GET(request: Request) {
  try {
    const access = await assertAdminAccess(request);
    if (!access.ok) {
      return access.response;
    }

    const businesses = await listAdminBusinesses();

    return NextResponse.json({
      success: true,
      businesses,
    });
  } catch (error) {
    return handleApiRouteError(error, "İşletme listesi yüklenemedi.");
  }
}
