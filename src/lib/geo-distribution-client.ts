import "server-only";

/**
 * Merkezi GEO dağıtım HTTP istemcisi.
 *
 * Ortam değişkenleri:
 * - NEXT_PUBLIC_GEO_API_URL → hedef webhook/API endpoint
 * - GEO_API_TOKEN           → Authorization: Bearer {token}
 *
 * Request body (GeoWebhookPayload):
 * { baslik, icerik, markaAdi, sehir, sektor, agresiflik }
 */

import type { GeoWebhookPayload } from "@/lib/distribution-core";
export interface GeoDistributionResult {
  ok: boolean;
  status: number;
  error?: string;
}

function resolveGeoApiUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_GEO_API_URL?.trim();
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
      console.log(
        `[GEO_API] "${payload.baslik}" → ${payload.markaAdi} (${payload.agresiflik}) iletildi.`,
      );
      return { ok: true, status: response.status };
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
