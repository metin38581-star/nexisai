import { NextResponse } from "next/server";

import { handleApiRouteError } from "@/lib/api-error";
import {
  processCampaignInBackground,
  type CampaignBackgroundJobInput,
} from "@/lib/campaign-background-processor";
import {
  failCampaignProcessingState,
  completeCampaignProcessingState,
  getCampaignProcessingState,
} from "@/lib/campaign-terminal-log-store";
import { getCampaignBaitCount } from "@/lib/campaign-store";
import { cronUnauthorizedResponse, isCronAuthorized } from "@/lib/cron-auth";

export const maxDuration = 300;

const JOB_TIMEOUT_MS = 280_000;

function isCampaignBackgroundJobInput(
  value: unknown,
): value is CampaignBackgroundJobInput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const input = value as CampaignBackgroundJobInput;
  return (
    typeof input.campaignId === "string" &&
    typeof input.userId === "string" &&
    Array.isArray(input.selectedQuestionIds)
  );
}

export async function POST(request: Request) {
  let campaignId: string | null = null;

  try {
    if (!isCronAuthorized(request)) {
      return cronUnauthorizedResponse();
    }

    const body: unknown = await request.json();
    if (!isCampaignBackgroundJobInput(body)) {
      return NextResponse.json(
        { success: false, error: "Geçersiz kampanya işlem gövdesi." },
        { status: 400 },
      );
    }

    campaignId = body.campaignId;

    await Promise.race([
      processCampaignInBackground(body),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("CAMPAIGN_JOB_TIMEOUT"));
        }, JOB_TIMEOUT_MS);
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "CAMPAIGN_JOB_TIMEOUT") {
      console.error("[CAMPAIGN_PROCESS]: Zaman aşımı:", error.message);

      if (campaignId) {
        const baitCount = await getCampaignBaitCount(campaignId);
        const processingState = await getCampaignProcessingState(campaignId);

        if (baitCount > 0) {
          const recoveryResult = {
            success: true,
            campaignId,
            status: "complete" as const,
            baitsGenerated: baitCount,
            message:
              "Kampanya içerikleri kaydedildi; dağıtım arka planda tamamlanacak.",
            terminalLogs: processingState?.terminalLogs ?? [],
          };

          await completeCampaignProcessingState(
            campaignId,
            recoveryResult.terminalLogs,
            recoveryResult,
          );
        } else {
          await failCampaignProcessingState(
            campaignId,
            processingState?.terminalLogs ?? [],
            "Kampanya arka plan işlemi zaman aşımına uğradı.",
          );
        }
      }

      return NextResponse.json(
        { success: false, error: "Kampanya işlemi zaman aşımına uğradı." },
        { status: 504 },
      );
    }

    return handleApiRouteError(error, "Kampanya arka plan işlemi başarısız.");
  }
}
