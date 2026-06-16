import type { NormalizedCampaignApiRequest } from "@/lib/campaign-api-normalize";
import type { CampaignMetrics } from "@/types/campaign";
import type { LlmInquiryResult } from "@/types/campaign";

function getSectorMultiplier(sektor: string): number {
  const multipliers: Record<string, number> = {
    "Otel & Konaklama": 1.1,
    "Diş Kliniği & Sağlık": 1.2,
    "Restoran & Kafe": 0.9,
    "Oto Galeri & Otomotiv": 0.85,
    "Güzellik & Saç Salonu": 1.15,
    "E-Ticaret & Giyim": 1.0,
  };
  return multipliers[sektor] ?? 0.6;
}

export function calculateDynamicMetrics(
  params: NormalizedCampaignApiRequest,
  llmResult: LlmInquiryResult,
): CampaignMetrics {
  const { gunlukButce, gunSayisi } = params;
  const totalBudget = gunlukButce * gunSayisi;
  const sectorMultiplier = getSectorMultiplier(params.sektor);

  const visibilityRate = llmResult.yapayZekaGorunurlukOrani;

  const trafficBase = llmResult.listed
    ? gunlukButce * 2.8 + sectorMultiplier * 140
    : gunlukButce * 1.4 + sectorMultiplier * 80;

  const estimatedTraffic = Math.round(
    (trafficBase + llmResult.suggestedRank * 35) * (gunSayisi / 7),
  );

  const spentRatio = gunlukButce >= 400 ? 0.38 : gunlukButce >= 200 ? 0.34 : 0.28;
  const spentBudget = Math.round(totalBudget * spentRatio);

  return {
    visibilityRate,
    estimatedTraffic,
    spentBudget,
    totalBudget,
  };
}

export function calculateBaselineMetrics(): CampaignMetrics {
  return {
    visibilityRate: 84,
    estimatedTraffic: 1247,
    spentBudget: 2550,
    totalBudget: 7500,
  };
}
