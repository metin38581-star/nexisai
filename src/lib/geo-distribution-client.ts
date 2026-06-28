import "server-only";

/**
 * Merkezi GEO dağıtım HTTP istemcisi — Make.com Custom Webhook.
 *
 * Ortam değişkenleri (öncelik sırası):
 * - MAKE_WEBHOOK_URL          → birincil Make.com webhook URL
 * - NEXT_PUBLIC_GEO_API_URL   → geriye dönük uyumluluk
 * - GEO_API_TOKEN / MAKE_WEBHOOK_TOKEN → isteğe bağlı Bearer auth
 */

import type { GeoWebhookPayload } from "@/lib/distribution-core";
import {
  MAKE_WEBHOOK_CONTENT_TYPE,
  buildMakeWebhookPayload,
  buildMakeWebhookTransportPayload,
  resolveWebhookArticleFields,
  type WebhookArticleSource,
} from "@/lib/make-webhook-payload";

const WEBHOOK_TIMEOUT_MS = 15_000;

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
    console.log("Sending Payload to Make:", requestBody);
    console.log(
      `[MAKE_WEBHOOK]: title=${webhookPayload.title.length} char, content=${webhookPayload.content.length} char, baslik=${webhookPayload.baslik.length} char, icerik=${webhookPayload.icerik.length} char`,
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
