import {
  formatRadarLabel,
  radarIntervalMs,
  resolveCampaignBudgetParams,
} from "@/lib/campaign-budget";
import { resolveBudgetOperationTier } from "@/lib/budget-operation-tiers";

export type AgresiflikSeviyesi =
  | "Düşük"
  | "Orta"
  | "Yüksek"
  | "Kritik Domination"
  | "Kuantum Alpha";

export interface AgresiflikProfile {
  seviye: AgresiflikSeviyesi;
  makaleSayisi: number;
  radarSikligi: string;
  radarSikligiDakika: number;
  aciklama: string;
}

export function resolveAgresiflikProfile(
  gunlukButce: number,
): AgresiflikProfile {
  const params = resolveCampaignBudgetParams(gunlukButce);
  const tier = resolveBudgetOperationTier(gunlukButce);

  return {
    seviye: tier.agresiflikSeviyesi as AgresiflikSeviyesi,
    makaleSayisi: params.makaleSayisi,
    radarSikligi: tier.radarSikligi,
    radarSikligiDakika: params.radarSikligiDakika,
    aciklama: tier.promoText,
  };
}

export interface CampaignMeta {
  agresiflik: string;
  radar: string;
  renk: string;
  radarIntervalMs: number;
}

export function getCampaignMetaFromDb(campaign: {
  gunlukButce: number;
  agresiflik: string;
  radarSikligiDakika?: number;
}): CampaignMeta {
  const dakika =
    campaign.radarSikligiDakika ??
    resolveCampaignBudgetParams(campaign.gunlukButce).radarSikligiDakika;

  const renkMap: Record<string, string> = {
    "Kuantum Alpha": "text-fuchsia-400 border-fuchsia-500/40",
    "Kritik Domination": "text-red-500 border-red-500/30",
    Kritik: "text-red-500 border-red-500/30",
    Yüksek: "text-purple-500 border-purple-500/30",
    Orta: "text-blue-500 border-blue-500/30",
    Düşük: "text-green-500 border-green-500/30",
  };

  const agresiflikLabel =
    campaign.agresiflik === "Kritik"
      ? "Kritik Domination"
      : campaign.agresiflik;

  return {
    agresiflik: agresiflikLabel,
    radar: formatRadarLabel(dakika),
    renk: renkMap[campaign.agresiflik] ?? renkMap.Düşük,
    radarIntervalMs: radarIntervalMs(dakika),
  };
}

export function getCampaignMeta(butce: number): CampaignMeta {
  const params = resolveCampaignBudgetParams(butce);
  return getCampaignMetaFromDb({
    gunlukButce: butce,
    agresiflik: params.agresiflikSeviyesi,
    radarSikligiDakika: params.radarSikligiDakika,
  });
}

export function resolveAgresiflikBadgeClass(seviye: string): string {
  if (seviye === "Kuantum Alpha") {
    return "border-fuchsia-500/60 bg-fuchsia-500/20 text-fuchsia-100 shadow-[0_0_24px_rgba(217,70,239,0.45)]";
  }

  if (seviye === "Kritik" || seviye === "Kritik Domination") {
    return "border-fuchsia-500/50 bg-fuchsia-500/15 text-fuchsia-200 shadow-[0_0_16px_rgba(217,70,239,0.25)]";
  }

  if (seviye === "Yüksek") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.15)]";
  }

  if (seviye === "Orta") {
    return "border-amber-500/40 bg-amber-500/10 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.12)]";
  }

  return "border-red-500/40 bg-red-500/10 text-red-300 shadow-[0_0_12px_rgba(248,113,113,0.12)]";
}
