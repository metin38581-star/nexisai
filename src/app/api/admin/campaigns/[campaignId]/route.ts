import { NextResponse } from "next/server";

import { assertSuperAdminAccess } from "@/lib/admin-auth";
import { getAdminCampaignDetail } from "@/lib/admin-store";
import { handleApiRouteError } from "@/lib/api-error";
import { resolveSiteOriginFromRequest } from "@/lib/site-origin";

export async function GET(
  request: Request,
  context: { params: Promise<{ campaignId: string }> },
) {
  try {
    const access = await assertSuperAdminAccess();
    if (!access.ok) {
      return access.response;
    }

    const { campaignId } = await context.params;
    const siteOrigin = resolveSiteOriginFromRequest(request);
    const campaign = await getAdminCampaignDetail(campaignId, siteOrigin);

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Kampanya kaydı bulunamadı." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      campaign,
    });
  } catch (error) {
    return handleApiRouteError(error, "Kampanya detayı yüklenemedi.");
  }
}
