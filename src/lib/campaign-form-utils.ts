import type { CampaignFormData } from "@/types/campaign";

export const CAMPAIGN_SELECT_PLACEHOLDER = "Lütfen Seçiniz";

export function isCampaignFormReadyForScan(
  form: Pick<CampaignFormData, "businessName" | "sector" | "city">,
): boolean {
  return (
    form.businessName.trim().length > 0 &&
    form.sector !== "" &&
    form.city !== ""
  );
}
