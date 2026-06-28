import { NextResponse } from "next/server";

import { handleApiRouteError } from "@/lib/api-error";
import { getActiveUserId } from "@/lib/auth-session";
import { userHasCampaignAccess } from "@/lib/campaign-store";
import { getCampaignGrowthLoop } from "@/lib/growth-loop-store";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const activeUserId = await getActiveUserId(request);
    if (!activeUserId) {
      return NextResponse.json(
        { success: false, error: "Growth loop için oturum açmanız gerekiyor." },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    const allowed = await userHasCampaignAccess(id, activeUserId);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Bu kampanyaya erişim yetkiniz yok." },
        { status: 403 },
      );
    }

    const loop = await getCampaignGrowthLoop(id);

    if (!loop) {
      return NextResponse.json({
        success: true,
        campaignId: id,
        emailSent: false,
        scoresUpdated: false,
        questionScores: [],
        status: "pending",
      });
    }

    return NextResponse.json({ success: true, status: "ready", ...loop });
  } catch (error) {
    return handleApiRouteError(error, "Growth loop alınamadı.");
  }
}
