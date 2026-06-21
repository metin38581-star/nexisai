import type { CampaignFormData } from "@/types/campaign";

export const CAMPAIGN_SELECT_PLACEHOLDER = "Lütfen Seçiniz";
export const CAMPAIGN_BUSINESS_NAME_PLACEHOLDER =
  "Lütfen işletme adını yazınız";

export const MIN_CAMPAIGN_DAILY_BUDGET = 300;
export const MIN_CAMPAIGN_DAYS = 3;

export function clampCampaignDailyBudget(value: number): number {
  if (!Number.isFinite(value)) {
    return MIN_CAMPAIGN_DAILY_BUDGET;
  }
  return value < MIN_CAMPAIGN_DAILY_BUDGET ? MIN_CAMPAIGN_DAILY_BUDGET : value;
}

export function clampCampaignDays(value: number): number {
  if (!Number.isFinite(value)) {
    return MIN_CAMPAIGN_DAYS;
  }
  return value < MIN_CAMPAIGN_DAYS ? MIN_CAMPAIGN_DAYS : value;
}

export function isCampaignFormReadyForScan(
  form: Pick<
    CampaignFormData,
    "businessName" | "sector" | "city" | "dailyBudget"
  >,
): boolean {
  return (
    form.businessName.trim().length > 0 &&
    form.sector !== "" &&
    form.city !== "" &&
    Number.isFinite(form.dailyBudget) &&
    form.dailyBudget >= MIN_CAMPAIGN_DAILY_BUDGET
  );
}
