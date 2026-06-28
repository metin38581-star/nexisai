import { NextResponse } from "next/server";

import { assertSuperAdminAccess } from "@/lib/admin-auth";
import { getAdminCampaignDetail } from "@/lib/admin-store";
import { handleApiRouteError } from "@/lib/api-error";

export async function GET(
  _request: Request,
  context: { params: Promise<{ campaignId: string }> },
) {
  try {
    const access = await assertSuperAdminAccess();
    if (!access.ok) {
      return access.response;
    }

    const { campaignId } = await context.params;
    const campaign = await getAdminCampaignDetail(campaignId);

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
