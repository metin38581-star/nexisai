import type { GeoWebhookPayload } from "@/lib/distribution-core";

export interface MakeWebhookArticleInput {
  baslik?: string | null;
  title?: string | null;
  icerik?: string | null;
  content?: string | null;
  slug?: string | null;
}

export interface MakeWebhookCampaignInput {
  campaignId?: string | null;
  id?: string | null;
  sehir?: string | null;
  sektor?: string | null;
  markaAdi?: string | null;
  agresiflik?: string | null;
}

function toPayloadString(value: unknown): string {
  if (value == null) {
    return "";
  }

  return String(value).trim();
}

/** Make.com webhook gövdesi — saf string alanlar, regex temizleme yok. */
export function buildMakeWebhookPayload(
  articleData: MakeWebhookArticleInput,
  campaign: MakeWebhookCampaignInput,
): GeoWebhookPayload {
  return {
    baslik: toPayloadString(articleData.baslik ?? articleData.title),
    icerik: toPayloadString(articleData.icerik ?? articleData.content),
    slug: toPayloadString(articleData.slug),
    sehir: toPayloadString(campaign.sehir),
    sektor: toPayloadString(campaign.sektor),
    markaAdi: toPayloadString(campaign.markaAdi),
    campaignId: toPayloadString(campaign.campaignId ?? campaign.id),
    agresiflik: toPayloadString(campaign.agresiflik),
  };
}

export const MAKE_WEBHOOK_CONTENT_TYPE = "application/json";
