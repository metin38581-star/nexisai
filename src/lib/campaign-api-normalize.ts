import type { CampaignApiRequest } from "@/types/campaign";
import type { CustomAnchorQuestion } from "@/types/campaign";
import { SECTOR_OPTIONS } from "@/lib/constants";
import type { BusinessSector } from "@/types/campaign";
import { DEFAULT_CAMPAIGN_DAYS } from "@/lib/campaign-form-utils";
import { isCustomSectorSlug } from "@/lib/sector-utils";

export interface NormalizedCampaignApiRequest {
  markaAdi: string;
  sektor: string;
  sehir: string;
  gunlukButce: number;
  gunSayisi: number;
  sectorSlug: BusinessSector | "";
  customSector?: string;
  customAnchorQuestions: CustomAnchorQuestion[];
  selectedQuestionIds: string[];
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
  if (isCustomSectorSlug(sectorSlug)) {
    return (
      body.customSector?.trim() ||
      body.sektor?.trim() ||
      body.sector?.trim() ||
      ""
    );
  }

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

function normalizeCustomAnchorQuestions(
  body: CampaignApiRequest,
): CustomAnchorQuestion[] {
  if (!Array.isArray(body.customAnchorQuestions)) {
    return [];
  }

  return body.customAnchorQuestions
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const id = typeof item.id === "string" ? item.id.trim() : "";
      const template =
        typeof item.template === "string" ? item.template.trim() : "";

      if (!id || !template) {
        return null;
      }

      return { id, template };
    })
    .filter((item): item is CustomAnchorQuestion => item !== null);
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
  const customSector = isCustomSectorSlug(sectorSlug)
    ? resolveSectorLabel(body, sectorSlug)
    : undefined;

  return {
    markaAdi: (body.companyName ?? body.markaAdi ?? "").trim(),
    sektor: resolveSectorLabel(body, sectorSlug),
    sehir: (body.city ?? body.sehir ?? "").trim(),
    gunlukButce: Number(body.budget ?? body.gunlukButce) || 10,
    gunSayisi: Number(body.campaignDays ?? body.gunSayisi) || DEFAULT_CAMPAIGN_DAYS,
    sectorSlug,
    customSector,
    customAnchorQuestions: normalizeCustomAnchorQuestions(body),
    selectedQuestionIds,
  };
}
