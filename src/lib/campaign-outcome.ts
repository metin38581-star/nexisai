import type { DistributionResult } from "@/lib/distribution-engine";

export interface CampaignOutcomeSummary {
  success: boolean;
  status: "complete" | "partial" | "failed";
  message: string;
  hubOnly: boolean;
}

export function summarizeCampaignOutcome(input: {
  distributionResults: DistributionResult[];
  hubPublished: boolean;
  forumPublishedCount: number;
  forumAttemptCount: number;
}): CampaignOutcomeSummary {
  const { distributionResults, hubPublished, forumPublishedCount, forumAttemptCount } =
    input;

  const externalSuccesses = distributionResults.filter(
    (result) => result.ok && result.externalLiveUrl,
  );
  const externalAttempts = distributionResults.length;
  const externalFailures =
    externalAttempts > 0 &&
    externalSuccesses.length === 0 &&
    distributionResults.every((result) => !result.ok);

  const forumFailed =
    forumAttemptCount > 0 && forumPublishedCount === 0;

  if (!hubPublished) {
    return {
      success: false,
      status: "failed",
      message: "Kampanya tamamlanamadı — içerik kaydı oluşturulamadı.",
      hubOnly: false,
    };
  }

  if (externalFailures && forumFailed) {
    return {
      success: true,
      status: "partial",
      message:
        "İçerikler NexisAI Hub'da yayında; dış kanallar ve forum yayını şu an tamamlanamadı.",
      hubOnly: true,
    };
  }

  if (externalFailures) {
    return {
      success: true,
      status: "partial",
      message:
        "İçerikler NexisAI Hub'da yayında; bazı dış dağıtım kanalları başarısız oldu.",
      hubOnly: true,
    };
  }

  if (forumFailed) {
    return {
      success: true,
      status: "partial",
      message:
        "Makaleler yayınlandı; forum cevapları şu an kaydedilemedi — linkler güncellenecek.",
      hubOnly: false,
    };
  }

  return {
    success: true,
    status: "complete",
    message: "İçerikler başarıyla yayınlandı!",
    hubOnly: externalSuccesses.length === 0 && externalAttempts === 0,
  };
}
