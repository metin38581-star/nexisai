import { NextResponse } from "next/server";

import { handleApiRouteError } from "@/lib/api-error";
import { getActiveSessionUser } from "@/lib/auth-session";
import {
  getCampaignBaitCount,
  isCampaignBackgroundJobFinished,
  userHasCampaignAccess,
} from "@/lib/campaign-store";
import {
  getCampaignProcessingState,
  interruptCampaignProcessingState,
  isCampaignProcessingStale,
} from "@/lib/campaign-terminal-log-store";
import { DISTRIBUTION_INTERRUPTED_MESSAGE } from "@/lib/campaign-distribution-timeout";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function buildCompleteStatusPayload(input: {
  campaignId: string;
  baitCount: number;
  terminalLogs?: unknown[];
  result?: Record<string, unknown> | null;
  message?: string;
}) {
  const fallbackResult = {
    success: true,
    campaignId: input.campaignId,
    status: "complete" as const,
    baitsGenerated: input.baitCount,
    message: input.message ?? "Kampanya tamamlandı.",
    metrics: {
      visibilityRate: 0,
      estimatedTraffic: 0,
      spentBudget: 0,
      totalBudget: 0,
    },
  };

  return {
    success: true,
    campaignId: input.campaignId,
    status: "complete" as const,
    terminalLogs: input.terminalLogs ?? [],
    result: input.result ?? fallbackResult,
    baitsGenerated: input.baitCount,
  };
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

    let processingState = await getCampaignProcessingState(campaignId);
    const baitCount = await getCampaignBaitCount(campaignId);

    if (processingState && isCampaignProcessingStale(processingState)) {
      if (baitCount > 0) {
        return NextResponse.json(
          buildCompleteStatusPayload({
            campaignId,
            baitCount,
            terminalLogs: processingState.terminalLogs,
            result: processingState.result as Record<string, unknown> | null,
            message:
              "Kampanya içerikleri üretildi; dağıtım paneli güncellendi.",
          }),
        );
      }

      await interruptCampaignProcessingState(
        campaignId,
        processingState.terminalLogs,
        DISTRIBUTION_INTERRUPTED_MESSAGE,
      );
      processingState = await getCampaignProcessingState(campaignId);
    }

    if (
      processingState &&
      (processingState.status === "started" ||
        processingState.status === "processing") &&
      baitCount > 0 &&
      (await isCampaignBackgroundJobFinished(campaignId))
    ) {
      return NextResponse.json(
        buildCompleteStatusPayload({
          campaignId,
          baitCount,
          terminalLogs: processingState.terminalLogs,
          result: processingState.result,
          message: "Kampanya tamamlandı.",
        }),
      );
    }

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
      return NextResponse.json(
        buildCompleteStatusPayload({
          campaignId,
          baitCount,
          message: "Kampanya tamamlandı.",
        }),
      );
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
