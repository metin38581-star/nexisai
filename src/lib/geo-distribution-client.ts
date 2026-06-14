import "server-only";

/**
 * Merkezi GEO dağıtım HTTP istemcisi.
 *
 * Ortam değişkenleri:
 * - NEXT_PUBLIC_GEO_API_URL → hedef webhook/API endpoint
 * - GEO_API_TOKEN           → Authorization: Bearer {token}
 *
 * Request body (GeoWebhookPayload):
 * { baslik, icerik, slug, markaAdi, sehir, sektor, agresiflik }
 */

import type { GeoWebhookPayload } from "@/lib/distribution-core";

const makeWebhookUrl = 'https://hook.eu1.make.com/srdywqh12ku4jf6yhyaf0m7u1dv9i0g4';
export interface MakeWebhookResponse {
  live_url?: string;
}

export interface GeoDistributionResult {
  ok: boolean;
  status: number;
  externalLiveUrl?: string;
  error?: string;
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

function resolveGeoApiUrl(): string | undefined {
  return makeWebhookUrl;
}

function resolveGeoApiToken(): string | undefined {
  const raw = process.env.GEO_API_TOKEN?.trim();
  if (!raw) {
    return undefined;
  }

  return raw.startsWith("Bearer ") ? raw.slice(7).trim() : raw;
}

export async function dispatchToCentralWebhook(
  payload: GeoWebhookPayload,
): Promise<GeoDistributionResult> {
  const apiUrl = resolveGeoApiUrl();

  if (!apiUrl) {
    console.warn("[GEO_API] NEXT_PUBLIC_GEO_API_URL tanımlı değil.");
    return { ok: false, status: 0, error: "API URL not configured" };
  }

  const token = resolveGeoApiToken();
  if (!token) {
    console.warn("[GEO_API] GEO_API_TOKEN tanımlı değil.");
    return { ok: false, status: 0, error: "Auth token not configured" };
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const responseBody: unknown = await response.json().catch(() => null);
      const { externalLiveUrl } = parseMakeWebhookResponse(responseBody);

      console.log(
        `[GEO_API] "${payload.baslik}" [${payload.slug}] → ${payload.markaAdi} iletildi.${externalLiveUrl ? ` external: ${externalLiveUrl}` : ""}`,
      );
      return { ok: true, status: response.status, externalLiveUrl };
    }

    const errorBody = await response.text().catch(() => "");
    console.error(
      `[GEO_API] Dağıtım başarısız (${response.status}):`,
      errorBody.slice(0, 300),
    );

    return {
      ok: false,
      status: response.status,
      error: errorBody || `HTTP ${response.status}`,
    };
  } catch (error) {
    console.error("[GEO_API] Bağlantı hatası:", error);
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}
