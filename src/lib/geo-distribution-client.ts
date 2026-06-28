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
  buildMakeWebhookRequestBody,
  escapeJSONString,
  normalizeMakeWebhookPayload,
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
  if (!payload.baslik?.trim()) {
    return "baslik eksik";
  }
  if (!payload.icerik?.trim()) {
    return "icerik eksik";
  }
  if (!payload.slug?.trim()) {
    return "slug eksik";
  }
  if (!payload.sehir?.trim()) {
    return "sehir eksik";
  }
  if (!payload.sektor?.trim()) {
    return "sektor eksik";
  }
  if (!payload.markaAdi?.trim()) {
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

  const normalizedPayload = normalizeMakeWebhookPayload(payload);

  const safePayload: GeoWebhookPayload = {
    ...normalizedPayload,
    icerik: escapeJSONString(String(payload.icerik ?? "")),
  };

  const validationError = validateWebhookPayload(safePayload);
  if (validationError) {
    const error = new Error(`Webhook payload geçersiz: ${validationError}`);
    console.error("Make Webhook Failed:", error, safePayload);
    return { ok: false, status: 0, error: error.message };
  }

  let requestBody: string;
  let requestByteLength: number;

  try {
    const built = buildMakeWebhookRequestBody(safePayload);
    requestBody = built.json;
    requestByteLength = built.byteLength;
  } catch (error) {
    console.error("Make Webhook Failed:", error, {
      slug: safePayload.slug,
      campaignId: safePayload.campaignId,
    });
    return {
      ok: false,
      status: 0,
      error:
        error instanceof Error
          ? error.message
          : "Webhook JSON serileştirme hatası",
    };
  }

  const token = resolveWebhookAuthToken();
  const bodyBytes = new TextEncoder().encode(requestBody);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    console.log(
      `[MAKE_WEBHOOK]: Tetikleniyor → "${safePayload.baslik}" [${safePayload.slug}] (${safePayload.sehir} / ${safePayload.sektor})`,
    );
    console.log("Sending Payload to Make:", requestBody);
    console.log(
      `[MAKE_WEBHOOK]: JSON doğrulandı — ${requestByteLength} byte, Content-Type: ${MAKE_WEBHOOK_CONTENT_TYPE}`,
    );

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": MAKE_WEBHOOK_CONTENT_TYPE,
        Accept: "application/json",
        "Content-Length": String(bodyBytes.byteLength),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: bodyBytes,
      signal: controller.signal,
    });

    if (response.ok) {
      const responseBody: unknown = await response.json().catch(() => null);
      const { externalLiveUrl } = parseMakeWebhookResponse(responseBody);

      console.log(
        `[MAKE_WEBHOOK]: OK (${response.status}) — "${safePayload.baslik}" [${safePayload.slug}]${externalLiveUrl ? ` → ${externalLiveUrl}` : ""}`,
      );

      return { ok: true, status: response.status, externalLiveUrl };
    }

    const errorBody = await response.text().catch(() => "");
    const error = new Error(
      `HTTP ${response.status}${errorBody ? `: ${errorBody.slice(0, 300)}` : ""}`,
    );
    console.error("Make Webhook Failed:", error, {
      slug: safePayload.slug,
      campaignId: safePayload.campaignId,
    });

    return {
      ok: false,
      status: response.status,
      error: error.message,
    };
  } catch (error) {
    console.error("Make Webhook Failed:", error, {
      slug: safePayload.slug,
      campaignId: safePayload.campaignId,
      sehir: safePayload.sehir,
      sektor: safePayload.sektor,
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

/** Tüm makaleler için Make.com webhook'unu paralel ve anında tetikler. */
export async function dispatchMakeWebhooksForArticles(
  articles: Array<{
    id?: string;
    baslik: string;
    icerik: string;
    slug: string;
  }>,
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
      const payload: GeoWebhookPayload = normalizeMakeWebhookPayload({
        campaignId: context.campaignId,
        baslik: article.baslik,
        icerik: article.icerik,
        slug: article.slug,
        markaAdi: context.markaAdi,
        sehir: context.sehir,
        sektor: context.sektor,
        agresiflik: context.agresiflik,
      });

      const result = await dispatchToCentralWebhook(payload);
      const key = article.id ?? article.slug;
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
