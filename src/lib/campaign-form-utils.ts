import type { CampaignFormData } from "@/types/campaign";

export const CAMPAIGN_SELECT_PLACEHOLDER = "Lütfen Seçiniz";
export const CAMPAIGN_BUSINESS_NAME_PLACEHOLDER =
  "Lütfen işletme adını yazınız";

export const MIN_CAMPAIGN_DAILY_BUDGET = 100;
export const MAX_CAMPAIGN_DAILY_BUDGET = 3000;
export const CAMPAIGN_BUDGET_STEP = 100;
export const MIN_CAMPAIGN_DAYS = 3;
export const DEFAULT_CAMPAIGN_DAYS = MIN_CAMPAIGN_DAYS;

export function clampCampaignDailyBudget(value: number): number {
  if (!Number.isFinite(value)) {
    return MIN_CAMPAIGN_DAILY_BUDGET;
  }

  const clamped = Math.min(
    MAX_CAMPAIGN_DAILY_BUDGET,
    Math.max(MIN_CAMPAIGN_DAILY_BUDGET, value),
  );

  return (
    Math.round(clamped / CAMPAIGN_BUDGET_STEP) * CAMPAIGN_BUDGET_STEP
  );
}

export function clampCampaignDays(value: number): number {
  if (!Number.isFinite(value)) {
    return MIN_CAMPAIGN_DAYS;
  }
  return value < MIN_CAMPAIGN_DAYS ? MIN_CAMPAIGN_DAYS : value;
}

/** Günlük bütçe × gün sayısı — iyzico paket tutarı. */
export function calculateCampaignPackageTotal(
  dailyBudget: number,
  campaignDays: number,
): number {
  const budget = clampCampaignDailyBudget(dailyBudget);
  const days = clampCampaignDays(campaignDays);
  return budget * days;
}

export function formatCampaignCurrency(amount: number): string {
  return `${amount.toLocaleString("tr-TR")} ₺`;
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
    form.dailyBudget >= MIN_CAMPAIGN_DAILY_BUDGET &&
    form.dailyBudget <= MAX_CAMPAIGN_DAILY_BUDGET
  );
}
