import type { CampaignFormData } from "@/types/campaign";
import { getCityLabel, SECTOR_OPTIONS } from "@/lib/constants";

const SESSION_KEY = "nexisai-campaign-session";
const ACTIVE_CAMPAIGN_KEY = "nexisai-active-campaign-id";

export interface CampaignSessionPayload {
  markaAdi: string;
  sektor: string;
  sehir: string;
  gunlukButce: number;
  gunSayisi: number;
  sectorSlug: CampaignFormData["sector"];
  selectedQuestionIds: string[];
  businessWebsite?: string;
  withTahsilat?: boolean;
}

export function buildCampaignSession(
  data: CampaignFormData,
  options?: { withTahsilat?: boolean },
): CampaignSessionPayload {
  const sektorLabel =
    SECTOR_OPTIONS.find((option) => option.value === data.sector)?.label ??
    data.sector;

  return {
    markaAdi: data.businessName.trim(),
    sektor: sektorLabel,
    sehir: data.city ? getCityLabel(data.city) : "",
    gunlukButce: data.dailyBudget,
    gunSayisi: data.campaignDays,
    sectorSlug: data.sector,
    selectedQuestionIds: data.selectedQuestionIds,
    businessWebsite: data.businessWebsite?.trim() || undefined,
    withTahsilat: options?.withTahsilat,
  };
}

export function saveCampaignSession(payload: CampaignSessionPayload): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
}

export function saveActiveCampaignId(campaignId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ACTIVE_CAMPAIGN_KEY, campaignId);
}

export function getActiveCampaignId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ACTIVE_CAMPAIGN_KEY);
}

export function clearActiveCampaignId(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ACTIVE_CAMPAIGN_KEY);
}

export function getCampaignSession(): CampaignSessionPayload | null {
  if (typeof window === "undefined") return null;

  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as CampaignSessionPayload;
  } catch {
    return null;
  }
}

export function clearCampaignSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(ACTIVE_CAMPAIGN_KEY);
}
