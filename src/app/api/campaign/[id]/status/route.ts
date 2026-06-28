import { NextResponse } from "next/server";

import { handleApiRouteError } from "@/lib/api-error";
import { getActiveSessionUser } from "@/lib/auth-session";
import {
  getCampaignBaitCount,
  userHasCampaignAccess,
} from "@/lib/campaign-store";
import { getCampaignProcessingState } from "@/lib/campaign-terminal-log-store";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id: campaignId } = await context.params;
    const sessionUser = await getActiveSessionUser(request);

    if (!sessionUser?.id) {
      return NextResponse.json(
        { success: false, error: "Oturum gerekli." },
        { status: 401 },
      );
    }

    const allowed = await userHasCampaignAccess(campaignId, sessionUser.id);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Kampanya bulunamadı." },
        { status: 404 },
      );
    }

    const processingState = await getCampaignProcessingState(campaignId);
    const baitCount = await getCampaignBaitCount(campaignId);

    if (processingState) {
      return NextResponse.json({
        success: true,
        campaignId,
        status: processingState.status,
        terminalLogs: processingState.terminalLogs,
        result: processingState.result,
        baitsGenerated:
          processingState.result?.baitsGenerated ??
          (baitCount > 0 ? baitCount : 0),
        updatedAt: processingState.updatedAt,
      });
    }

    if (baitCount > 0) {
      return NextResponse.json({
        success: true,
        campaignId,
        status: "complete",
        terminalLogs: [],
        baitsGenerated: baitCount,
      });
    }

    return NextResponse.json({
      success: true,
      campaignId,
      status: "processing",
      terminalLogs: [],
      baitsGenerated: 0,
    });
  } catch (error) {
    return handleApiRouteError(error, "Kampanya durumu alınamadı.");
  }
}
