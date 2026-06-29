import "server-only";

export const CAMPAIGN_STATUS = {
  PENDING_PAYMENT: "pending_payment",
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type CampaignStatus =
  (typeof CAMPAIGN_STATUS)[keyof typeof CAMPAIGN_STATUS];

export interface CampaignLifecycleRecord {
  id: string;
  userId: string | null;
  status: string;
  gunlukButce: number;
  gunSayisi: number;
  startDate: Date | null;
  endDate: Date | null;
  totalPaid: number | null;
  markaAdi: string;
  sektor: string;
  sehir: string;
}

export function isCampaignWithinActiveWindow(
  campaign: Pick<CampaignLifecycleRecord, "status" | "startDate" | "endDate">,
  now = new Date(),
): boolean {
  if (campaign.status !== CAMPAIGN_STATUS.ACTIVE) {
    return false;
  }

  if (campaign.startDate && now < campaign.startDate) {
    return false;
  }

  if (campaign.endDate && now > campaign.endDate) {
    return false;
  }

  return true;
}

export function computeCampaignEndDate(
  startDate: Date,
  gunSayisi: number,
): Date {
  const end = new Date(startDate);
  end.setUTCDate(end.getUTCDate() + Math.max(gunSayisi, 1));
  return end;
}
