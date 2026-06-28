import "server-only";

/**
 * Merkezi GEO dağıtım HTTP istemcisi — Make.com Custom Webhook + Dev.to Direct API.
 *
 * Ortam değişkenleri (öncelik sırası):
 * - MAKE_WEBHOOK_URL          → birincil Make.com webhook URL
 * - NEXT_PUBLIC_GEO_API_URL   → geriye dönük uyumluluk
 * - GEO_API_TOKEN / MAKE_WEBHOOK_TOKEN → isteğe bağlı Bearer auth
 * - DEVTO_API_KEY             → Dev.to doğrudan yayın (Make.com fallback korunur)
 */

import type { GeoWebhookPayload } from "@/lib/distribution-core";
import { htmlToMarkdown } from "@/lib/html-content-utils";
import { buildHubArticleUrl } from "@/lib/hub-url";
import {
  MAKE_WEBHOOK_CONTENT_TYPE,
  buildMakeWebhookPayload,
  buildMakeWebhookTransportPayload,
  resolveWebhookArticleFields,
  type WebhookArticleSource,
} from "@/lib/make-webhook-payload";

const WEBHOOK_TIMEOUT_MS = 15_000;
const DEVTO_API_TIMEOUT_MS = 15_000;
const DEVTO_API_URL = "https://dev.to/api/articles";
const DEVTO_MAX_TITLE_LENGTH = 128;
const DEVTO_MAX_BODY_LENGTH = 100_000;
const DEVTO_DEFAULT_TITLE = "NexisAI Sektörel Analiz";
const DEVTO_DEFAULT_BODY = "İçerik hazırlanıyor...";
const DEVTO_TAGS = ["ai", "seo"] as const;

export interface DevToArticlePayload {
  article: {
    title: string;
    body_markdown: string;
    published: boolean;
    tags: string[];
    canonical_url?: string;
  };
}

function sanitizeDevToTitle(value: string): string {
  const title = String(value || "").trim() || DEVTO_DEFAULT_TITLE;
  if (title.length <= DEVTO_MAX_TITLE_LENGTH) {
    return title;
  }
  return `${title.slice(0, DEVTO_MAX_TITLE_LENGTH - 1).trim()}…`;
}

function prepareDevToBodyMarkdown(rawContent: string, title: string): string {
  const trimmed = String(rawContent || "").trim();
  if (!trimmed) {
    return DEVTO_DEFAULT_BODY;
  }

  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    const markdown = htmlToMarkdown(trimmed, title);
    const withoutDuplicateHeading = markdown
      .replace(/^#\s+.+\n\n?/m, "")
      .trim();
    return withoutDuplicateHeading || DEVTO_DEFAULT_BODY;
  }

  return trimmed;
}

function sanitizeDevToBody(rawContent: string, title: string): string {
  const body = prepareDevToBodyMarkdown(rawContent, title);
  if (body.length <= DEVTO_MAX_BODY_LENGTH) {
    return body;
  }
  return `${body.slice(0, DEVTO_MAX_BODY_LENGTH - 1).trim()}…`;
}

/** Dev.to Forem API gövdesi — minimum alan seti, 422 riskini azaltır. */
export function buildDevToArticlePayload(
  articleData: DevToDirectArticleData,
): DevToArticlePayload {
  const title = sanitizeDevToTitle(articleData.baslik);
  const body_markdown = sanitizeDevToBody(articleData.icerik, title);
  const slug = String(articleData.slug || "").trim();

  const payload: DevToArticlePayload = {
    article: {
      title,
      body_markdown,
      published: true,
      tags: [...DEVTO_TAGS],
    },
  };

  if (slug) {
    payload.article.canonical_url = buildHubArticleUrl(slug);
  }

  return payload;
}

export interface DevToDirectArticleData {
  baslik: string;
  icerik: string;
  slug?: string;
  campaignId?: string;
  sehir?: string;
  sektor?: string;
  markaAdi?: string;
}

export interface DevToDirectPublishResult {
  ok: boolean;
  url?: string;
  error?: string;
  status?: number;
}

export function isDevToDirectConfigured(): boolean {
  return Boolean(process.env.DEVTO_API_KEY?.trim());
}

/** Dev.to Forem API — Make.com olmadan doğrudan makale yayını. */
export async function publishToDevToDirect(
  articleData: DevToDirectArticleData,
): Promise<string | null> {
  const secureSlug = String(articleData.slug || "").trim();
  const secureCampaignId = String(articleData.campaignId || "").trim();
  const payload = buildDevToArticlePayload(articleData);
  const { title, body_markdown } = payload.article;

  if (!process.env.DEVTO_API_KEY?.trim()) {
    console.warn("[DEVTO_DIRECT_API]: DEVTO_API_KEY eksik, bu kanal atlanıyor.");
    return null;
  }

  if (!title.trim() || !body_markdown.trim()) {
    console.error("[DEVTO_DIRECT_ERROR]: title veya body_markdown boş — yayın iptal.", {
      slug: secureSlug || undefined,
      campaignId: secureCampaignId || undefined,
      titleLength: title.length,
      bodyLength: body_markdown.length,
    });
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEVTO_API_TIMEOUT_MS);

  try {
    console.log(
      `[DEVTO_DIRECT_API]: Yayınlanıyor → "${title}" (${body_markdown.length} char)${secureSlug ? ` [${secureSlug}]` : ""}${secureCampaignId ? ` (campaign: ${secureCampaignId})` : ""}`,
    );
    console.log("[DEVTO_DIRECT_API]: Payload özeti", {
      titleLength: title.length,
      bodyLength: body_markdown.length,
      tags: payload.article.tags,
      hasCanonicalUrl: Boolean(payload.article.canonical_url),
    });

    const response = await fetch(DEVTO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.DEVTO_API_KEY.trim(),
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      let parsedError: unknown = null;
      try {
        parsedError = errorText ? JSON.parse(errorText) : null;
      } catch {
        parsedError = errorText.slice(0, 500) || null;
      }

      console.error("[DEVTO_DIRECT_ERROR]:", {
        status: response.status,
        slug: secureSlug || undefined,
        campaignId: secureCampaignId || undefined,
        titleLength: title.length,
        bodyLength: body_markdown.length,
        titlePreview: title.slice(0, 80),
        bodyPreview: body_markdown.slice(0, 120),
        error: parsedError,
      });

      if (response.status === 422) {
        console.error(
          "[DEVTO_DIRECT_ERROR]: 422 Unprocessable Entity — title/body_markdown/tags doğrulaması başarısız.",
          {
            tags: payload.article.tags,
            published: payload.article.published,
          },
        );
      }

      return null;
    }

    const resData = (await response.json()) as { url?: string };
    const liveUrl =
      typeof resData.url === "string" && resData.url.trim()
        ? resData.url.trim()
        : null;

    if (!liveUrl) {
      console.error("[DEVTO_DIRECT_ERROR]: Yanıtta url alanı yok.", {
        slug: secureSlug || undefined,
        campaignId: secureCampaignId || undefined,
      });
      return null;
    }

    console.log(
      "[DEVTO_DIRECT_SUCCESS]: Makale başarıyla yayınlandı →",
      liveUrl,
    );
    return liveUrl;
  } catch (error) {
    console.error("[DEVTO_DIRECT_EXCEPTION]:", {
      slug: secureSlug || undefined,
      campaignId: secureCampaignId || undefined,
      sehir: articleData.sehir,
      sektor: articleData.sektor,
      markaAdi: articleData.markaAdi,
      error,
    });
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Blogger slotları için Dev.to doğrudan yayın — başarısız olanlar Make.com'a bırakılır. */
export async function dispatchDevToDirectForArticles(
  articles: WebhookArticleSource[],
  context: {
    campaignId: string;
    markaAdi: string;
    sehir: string;
    sektor: string;
  },
): Promise<Map<string, DevToDirectPublishResult>> {
  const results = new Map<string, DevToDirectPublishResult>();

  if (articles.length === 0) {
    return results;
  }

  if (!isDevToDirectConfigured()) {
    console.warn(
      "[DEVTO_DIRECT_API]: DEVTO_API_KEY yapılandırılmamış — doğrudan kanal atlanıyor.",
    );
    return results;
  }

  console.log(
    `[DEVTO_DIRECT_API]: ${articles.length} makale için toplu yayın başlatıldı (campaign: ${context.campaignId}).`,
  );

  await Promise.all(
    articles.map(async (article) => {
      const resolved = resolveWebhookArticleFields(article, {
        defaultBaslik: context.markaAdi
          ? `${context.markaAdi} SEO Optimizasyonu`
          : undefined,
      });
      const key = article.id ?? resolved.slug;

      if (!resolved.hasContent) {
        console.error(
          "[DEVTO_DIRECT_ABORT]: Makale içeriği boş olduğu için Dev.to yayını atlandı!",
          {
            id: article.id,
            slug: article.slug,
            baslik: resolved.baslik,
          },
        );
        results.set(key, {
          ok: false,
          error: "icerik eksik — Dev.to atlandı",
        });
        return;
      }

      const url = await publishToDevToDirect({
        baslik: resolved.baslik,
        icerik: resolved.icerik,
        slug: resolved.slug,
        campaignId: context.campaignId,
        sehir: context.sehir,
        sektor: context.sektor,
        markaAdi: context.markaAdi,
      });

      results.set(key, {
        ok: Boolean(url),
        url: url ?? undefined,
        status: url ? 201 : 0,
        error: url ? undefined : "Dev.to yayını başarısız",
      });
    }),
  );

  const successCount = Array.from(results.values()).filter((entry) => entry.ok)
    .length;
  console.log(
    `[DEVTO_DIRECT_API]: Toplu yayın tamamlandı — ${successCount}/${articles.length} başarılı.`,
  );

  return results;
}

export interface MakeWebhookResponse {
  live_url?: string;
}

export interface GeoDistributionResult {
  ok: boolean;
  status: number;
  externalLiveUrl?: string;
  error?: string;
}

export function isMakeWebhookConfigured(): boolean {
  return Boolean(resolveMakeWebhookUrl());
}

export function parseMakeWebhookResponse(body: unknown): {
  externalLiveUrl?: string;
} {
  if (!body || typeof body !== "object") {
    return {};
  }

  const record = body as MakeWebhookResponse & {
    external_live_url?: string;
  };

  const externalLiveUrl = record.external_live_url ?? record.live_url;

  if (typeof externalLiveUrl === "string" && externalLiveUrl.trim()) {
    return { externalLiveUrl: externalLiveUrl.trim() };
  }

  return {};
}

function resolveMakeWebhookUrl(): string | undefined {
  const candidates = [
    process.env.MAKE_WEBHOOK_URL?.trim(),
    process.env.NEXT_PUBLIC_GEO_API_URL?.trim(),
  ];

  for (const candidate of candidates) {
    if (candidate) {
      return candidate;
    }
  }

  return undefined;
}

function resolveWebhookAuthToken(): string | undefined {
  const raw =
    process.env.MAKE_WEBHOOK_TOKEN?.trim() ||
    process.env.GEO_API_TOKEN?.trim();

  if (!raw) {
    return undefined;
  }

  return raw.startsWith("Bearer ") ? raw.slice(7).trim() : raw;
}

function validateWebhookPayload(payload: GeoWebhookPayload): string | null {
  if (!payload.title && !payload.baslik) {
    return "title/baslik eksik";
  }
  if (!payload.content && !payload.icerik) {
    return "content/icerik eksik";
  }
  if (!payload.slug) {
    return "slug eksik";
  }
  if (!payload.sehir) {
    return "sehir eksik";
  }
  if (!payload.sektor) {
    return "sektor eksik";
  }
  if (!payload.markaAdi) {
    return "markaAdi eksik";
  }
  return null;
}

export async function dispatchToCentralWebhook(
  payload: GeoWebhookPayload,
): Promise<GeoDistributionResult> {
  const apiUrl = resolveMakeWebhookUrl();

  if (!apiUrl) {
    const error = new Error(
      "MAKE_WEBHOOK_URL (veya NEXT_PUBLIC_GEO_API_URL) tanımlı değil.",
    );
    console.error("Make Webhook Failed:", error);
    return { ok: false, status: 0, error: error.message };
  }

  const webhookPayload = buildMakeWebhookTransportPayload(payload);

  const validationError = validateWebhookPayload(webhookPayload);
  if (validationError) {
    const error = new Error(`Webhook payload geçersiz: ${validationError}`);
    console.error("Make Webhook Failed:", error, {
      titleLength: webhookPayload.title.length,
      contentLength: webhookPayload.content.length,
      baslikLength: webhookPayload.baslik.length,
      icerikLength: webhookPayload.icerik.length,
      slug: webhookPayload.slug,
      campaignId: webhookPayload.campaignId,
    });
    return { ok: false, status: 0, error: error.message };
  }

  const requestBody = JSON.stringify(webhookPayload);
  const token = resolveWebhookAuthToken();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    console.log(
      `[MAKE_WEBHOOK]: Tetikleniyor → "${webhookPayload.title}" [${webhookPayload.slug}] (${webhookPayload.sehir} / ${webhookPayload.sektor})`,
    );
    console.log(
      `[MAKE_WEBHOOK]: Payload boyutu ${requestBody.length} byte; title=${webhookPayload.title.length} char, content=${webhookPayload.content.length} char`,
    );

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": MAKE_WEBHOOK_CONTENT_TYPE,
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: requestBody,
      signal: controller.signal,
    });

    if (response.ok) {
      const responseBody: unknown = await response.json().catch(() => null);
      const { externalLiveUrl } = parseMakeWebhookResponse(responseBody);

      console.log(
        `[MAKE_WEBHOOK]: OK (${response.status}) — "${webhookPayload.title}" [${webhookPayload.slug}]${externalLiveUrl ? ` → ${externalLiveUrl}` : ""}`,
      );

      return { ok: true, status: response.status, externalLiveUrl };
    }

    const errorBody = await response.text().catch(() => "");
    const error = new Error(
      `HTTP ${response.status}${errorBody ? `: ${errorBody.slice(0, 300)}` : ""}`,
    );
    console.error("Make Webhook Failed:", error, {
      slug: webhookPayload.slug,
      campaignId: webhookPayload.campaignId,
    });

    return {
      ok: false,
      status: response.status,
      error: error.message,
    };
  } catch (error) {
    console.error("Make Webhook Failed:", error, {
      slug: webhookPayload.slug,
      campaignId: webhookPayload.campaignId,
      sehir: webhookPayload.sehir,
      sektor: webhookPayload.sektor,
    });

    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : "Network error",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function triggerWebhook(
  input: GeoWebhookPayload,
): Promise<GeoDistributionResult> {
  return dispatchToCentralWebhook(input);
}

/** Tüm makaleler için Make.com webhook'unu paralel ve anında tetikler. */
export async function dispatchMakeWebhooksForArticles(
  articles: WebhookArticleSource[],
  context: {
    campaignId: string;
    markaAdi: string;
    sehir: string;
    sektor: string;
    agresiflik: string;
  },
): Promise<Map<string, GeoDistributionResult>> {
  const results = new Map<string, GeoDistributionResult>();

  if (articles.length === 0) {
    console.warn("[MAKE_WEBHOOK]: Tetiklenecek makale yok.");
    return results;
  }

  if (!isMakeWebhookConfigured()) {
    console.error(
      "Make Webhook Failed:",
      new Error("MAKE_WEBHOOK_URL yapılandırılmamış — webhook atlanıyor."),
    );
    return results;
  }

  console.log(
    `[MAKE_WEBHOOK]: ${articles.length} makale için toplu tetikleme başlatıldı (campaign: ${context.campaignId}).`,
  );

  await Promise.all(
    articles.map(async (article) => {
      const resolved = resolveWebhookArticleFields(article, {
        defaultBaslik: context.markaAdi
          ? `${context.markaAdi} SEO Optimizasyonu`
          : undefined,
      });

      const key = article.id ?? resolved.slug;

      if (!resolved.hasContent) {
        console.error(
          "[WEBHOOK_ABORT]: Makale içeriği boş olduğu için webhook tetiklenmedi!",
          {
            id: article.id,
            slug: article.slug,
            baslik: resolved.baslik,
            keys: Object.keys(article),
            baslikSources: {
              baslik: article.baslik,
              title: article.title,
              subject: article.subject,
            },
            icerikSources: {
              icerik: article.icerik,
              content: article.content,
              body: article.body,
              html: article.html,
            },
          },
        );
        results.set(key, {
          ok: false,
          status: 0,
          error: "icerik eksik — webhook atlandı",
        });
        return;
      }

      const payload = buildMakeWebhookPayload(resolved, context);
      const result = await dispatchToCentralWebhook(payload);
      results.set(key, result);
    }),
  );

  const successCount = Array.from(results.values()).filter((entry) => entry.ok)
    .length;
  console.log(
    `[MAKE_WEBHOOK]: Toplu tetikleme tamamlandı — ${successCount}/${articles.length} başarılı.`,
  );

  return results;
}
