import type { CampaignApiRequest } from "@/types/campaign";
import { SECTOR_OPTIONS } from "@/lib/constants";
import type { BusinessSector } from "@/types/campaign";
import { normalizeBusinessDomain } from "@/lib/business-domain";
import { DEFAULT_CAMPAIGN_DAYS, clampCampaignDays } from "@/lib/campaign-form-utils";

export interface NormalizedCampaignApiRequest {
  markaAdi: string;
  sektor: string;
  sehir: string;
  gunlukButce: number;
  gunSayisi: number;
  sectorSlug: BusinessSector | "";
  selectedQuestionIds: string[];
  businessDomain: string | null;
}

function resolveSectorSlug(body: CampaignApiRequest): BusinessSector | "" {
  const explicitSlug = body.sectorSlug?.trim();
  if (
    explicitSlug &&
    SECTOR_OPTIONS.some((option) => option.value === explicitSlug)
  ) {
    return explicitSlug as BusinessSector;
  }

  const sectorField = (body.sector ?? "").trim();
  if (SECTOR_OPTIONS.some((option) => option.value === sectorField)) {
    return sectorField as BusinessSector;
  }

  const label = (body.sektor ?? sectorField).trim();
  const byLabel = SECTOR_OPTIONS.find(
    (option) => option.label.toLowerCase() === label.toLowerCase(),
  );
  return byLabel?.value ?? "";
}

function resolveSectorLabel(
  body: CampaignApiRequest,
  sectorSlug: BusinessSector | "",
): string {
  if (body.sektor?.trim()) {
    return body.sektor.trim();
  }

  if (sectorSlug) {
    return (
      SECTOR_OPTIONS.find((option) => option.value === sectorSlug)?.label ??
      sectorSlug
    );
  }

  return (body.sector ?? "").trim();
}

export function normalizeCampaignApiRequest(
  body: CampaignApiRequest,
): NormalizedCampaignApiRequest {
  const selectedQuestionIds = Array.isArray(body.selectedQuestionIds)
    ? body.selectedQuestionIds.filter(
        (id): id is string => typeof id === "string" && id.trim().length > 0,
      )
    : [];
  const sectorSlug = resolveSectorSlug(body);

  return {
    markaAdi: (body.companyName ?? body.markaAdi ?? "").trim(),
    sektor: resolveSectorLabel(body, sectorSlug),
    sehir: (body.city ?? body.sehir ?? "").trim(),
    gunlukButce: Number(body.budget ?? body.gunlukButce) || 100,
    gunSayisi: clampCampaignDays(
      Number(body.campaignDays ?? body.gunSayisi) || DEFAULT_CAMPAIGN_DAYS,
    ),
    sectorSlug,
    selectedQuestionIds,
    businessDomain: normalizeBusinessDomain(
      body.businessDomain ?? body.businessWebsite ?? body.websiteUrl,
    ),
  };
}
