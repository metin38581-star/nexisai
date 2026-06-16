import { NextResponse } from "next/server";

import { assertAdminAccess } from "@/lib/admin-auth";
import { getAdminBusinessDetail } from "@/lib/admin-store";
import { handleApiRouteError } from "@/lib/api-error";

export async function GET(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const access = await assertAdminAccess(request);
    if (!access.ok) {
      return access.response;
    }

    const { userId } = await context.params;
    const detail = await getAdminBusinessDetail(userId);

    if (!detail) {
      return NextResponse.json(
        { success: false, error: "İşletme kaydı bulunamadı." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      business: detail,
    });
  } catch (error) {
    return handleApiRouteError(error, "İşletme detayı yüklenemedi.");
  }
}
