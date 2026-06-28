import { NextResponse } from "next/server";

import { assertSuperAdminAccess } from "@/lib/admin-auth";
import { listAdminCampaignOverview } from "@/lib/admin-store";
import { handleApiRouteError } from "@/lib/api-error";
import { resolveSiteOriginFromRequest } from "@/lib/site-origin";

export async function GET(request: Request) {
  try {
    const access = await assertSuperAdminAccess();
    if (!access.ok) {
      return access.response;
    }

    const siteOrigin = resolveSiteOriginFromRequest(request);
    const overview = await listAdminCampaignOverview(siteOrigin);

    return NextResponse.json({
      success: true,
      ...overview,
    });
  } catch (error) {
    return handleApiRouteError(error, "Merkezi veri özeti yüklenemedi.");
  }
}
