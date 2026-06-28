import "server-only";

import type { CampaignResponse, TerminalLogEntry } from "@/types/campaign";
import { getCampaignBaitCount } from "@/lib/campaign-store";
import { completeCampaignProcessingState } from "@/lib/campaign-terminal-log-store";

export const CAMPAIGN_RECOVERED_MESSAGE =
  "Kampanya içerikleri hazır; NexisAI Hub yayını aktif.";

export function buildRecoveredCampaignResult(input: {
  campaignId: string;
  baitCount: number;
  terminalLogs?: TerminalLogEntry[];
  message?: string;
}): Partial<CampaignResponse> {
  return {
    success: true,
    campaignId: input.campaignId,
    status: "complete",
    baitsGenerated: input.baitCount,
    message: input.message ?? CAMPAIGN_RECOVERED_MESSAGE,
    terminalLogs: input.terminalLogs ?? [],
    metrics: {
      visibilityRate: 0,
      estimatedTraffic: 0,
      spentBudget: 0,
      totalBudget: 0,
    },
  };
}

/** DB'de bait varsa failed/interrupted durumunu complete'e yükseltir. */
export async function recoverCampaignProcessingIfBaitsExist(input: {
  campaignId: string;
  terminalLogs?: TerminalLogEntry[];
  message?: string;
}): Promise<{ recovered: boolean; baitCount: number; result?: Partial<CampaignResponse> }> {
  const baitCount = await getCampaignBaitCount(input.campaignId);
  if (baitCount <= 0) {
    return { recovered: false, baitCount: 0 };
  }

  const result = buildRecoveredCampaignResult({
    campaignId: input.campaignId,
    baitCount,
    terminalLogs: input.terminalLogs,
    message: input.message,
  });

  await completeCampaignProcessingState(
    input.campaignId,
    result.terminalLogs ?? [],
    result,
  );

  return { recovered: true, baitCount, result };
}
