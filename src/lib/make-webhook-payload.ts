import type { GeoWebhookPayload } from "@/lib/distribution-core";

/** Dağıtım hattından webhook'a aktarılabilecek makale alanları. */
export interface WebhookArticleSource {
  id?: string;
  baslik?: string | null;
  title?: string | null;
  subject?: string | null;
  icerik?: string | null;
  content?: string | null;
  body?: string | null;
  html?: string | null;
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

export interface ResolvedWebhookArticle {
  id?: string;
  baslik: string;
  icerik: string;
  slug: string;
  hasContent: boolean;
}

const DEFAULT_BASLIK = "NexisAI SEO Optimizasyonu";
const DEFAULT_SLUG = "optimizasyon-makalesi";

function readNonEmptyString(...candidates: Array<unknown>): string {
  for (const candidate of candidates) {
    if (candidate == null) {
      continue;
    }

    const text = String(candidate).trim();
    if (text.length > 0) {
      return text;
    }
  }

  return "";
}

/** Makale objesindeki tüm olası key'lerden baslik/icerik/slug çözümler. */
export function resolveWebhookArticleFields(
  article: WebhookArticleSource,
  options?: {
    defaultBaslik?: string;
    defaultSlug?: string;
  },
): ResolvedWebhookArticle {
  const baslik =
    readNonEmptyString(
      article.baslik,
      article.title,
      article.subject,
      options?.defaultBaslik,
    ) || DEFAULT_BASLIK;

  const icerik = readNonEmptyString(
    article.icerik,
    article.content,
    article.body,
    article.html,
  );

  const slug =
    readNonEmptyString(article.slug, options?.defaultSlug) || DEFAULT_SLUG;

  return {
    id: article.id,
    baslik,
    icerik,
    slug,
    hasContent: icerik.length > 0,
  };
}

/** Make.com webhook gövdesi — çözümlenmiş makale + kampanya meta. */
export function buildMakeWebhookPayload(
  articleData: WebhookArticleSource,
  campaign: MakeWebhookCampaignInput,
): GeoWebhookPayload {
  const defaultBaslik = campaign.markaAdi
    ? `${String(campaign.markaAdi).trim()} SEO Optimizasyonu`
    : DEFAULT_BASLIK;

  const resolved = resolveWebhookArticleFields(articleData, {
    defaultBaslik,
  });

  return {
    baslik: resolved.baslik,
    icerik: resolved.icerik,
    slug: resolved.slug,
    sehir: readNonEmptyString(campaign.sehir),
    sektor: readNonEmptyString(campaign.sektor),
    markaAdi: readNonEmptyString(campaign.markaAdi),
    campaignId: readNonEmptyString(campaign.campaignId, campaign.id),
    agresiflik: readNonEmptyString(campaign.agresiflik),
  };
}

export const MAKE_WEBHOOK_CONTENT_TYPE = "application/json";
