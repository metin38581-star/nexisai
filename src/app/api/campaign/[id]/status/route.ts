import { NextResponse } from "next/server";

import { handleApiRouteError } from "@/lib/api-error";
import { getActiveSessionUser } from "@/lib/auth-session";
import { getCampaignBaitCount } from "@/lib/campaign-store";
import { getCampaignProcessingState } from "@/lib/campaign-terminal-log-store";
import { prisma } from "@/lib/db";
import { hasDatabaseUrl } from "@/lib/server-env";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function assertCampaignAccess(
  campaignId: string,
  userId: string,
): Promise<boolean> {
  if (!hasDatabaseUrl()) {
    return true;
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { userId: true },
  });

  return campaign?.userId === userId;
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

    const allowed = await assertCampaignAccess(campaignId, sessionUser.id);
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
