import type { CampaignApiRequest } from "@/types/campaign";

export interface NormalizedCampaignApiRequest {
  markaAdi: string;
  sektor: string;
  sehir: string;
  gunlukButce: number;
  gunSayisi: number;
}

export function normalizeCampaignApiRequest(
  body: CampaignApiRequest,
): NormalizedCampaignApiRequest {
  return {
    markaAdi: (body.companyName ?? body.markaAdi ?? "").trim(),
    sektor: (body.sector ?? body.sektor ?? "").trim(),
    sehir: (body.city ?? body.sehir ?? "").trim(),
    gunlukButce: Number(body.budget ?? body.gunlukButce) || 10,
    gunSayisi: Number(body.campaignDays ?? body.gunSayisi) || 7,
  };
}
