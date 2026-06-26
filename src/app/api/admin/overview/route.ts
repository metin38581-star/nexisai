import { NextResponse } from "next/server";

import { assertSuperAdminAccess } from "@/lib/admin-auth";
import { listAdminCampaignOverview } from "@/lib/admin-store";
import { handleApiRouteError } from "@/lib/api-error";

export async function GET(request: Request) {
  try {
    const access = await assertSuperAdminAccess(request);
    if (!access.ok) {
      return access.response;
    }

    const overview = await listAdminCampaignOverview();

    return NextResponse.json({
      success: true,
      ...overview,
    });
  } catch (error) {
    return handleApiRouteError(error, "Merkezi veri özeti yüklenemedi.");
  }
}
