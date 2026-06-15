import type { CampaignFormData } from "@/types/campaign";

export const CAMPAIGN_SELECT_PLACEHOLDER = "Lütfen Seçiniz";
export const CAMPAIGN_BUSINESS_NAME_PLACEHOLDER =
  "Lütfen işletme adını yazınız";

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
    form.dailyBudget > 0
  );
}
