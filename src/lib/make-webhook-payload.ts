import type { GeoWebhookPayload } from "@/lib/distribution-core";

/** Make.com webhook alanları — yalnızca düz string değerler. */
const WEBHOOK_STRING_FIELDS = [
  "campaignId",
  "baslik",
  "icerik",
  "slug",
  "markaAdi",
  "sehir",
  "sektor",
  "agresiflik",
] as const satisfies ReadonlyArray<keyof GeoWebhookPayload>;

/**
 * JSON.stringify öncesi alanları temizler.
 * HTML içindeki tırnak, ters eğik çizgi ve satır sonları JSON.stringify ile escape edilir;
 * kontrol karakterleri ve null byte'lar kaldırılır.
 */
export function sanitizeWebhookField(value: unknown): string {
  const text = value == null ? "" : String(value);

  return text
    .replace(/\0/g, "")
    .replace(/\uFEFF/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, " ")
    .normalize("NFC");
}

/** Webhook payload nesnesini JSON-safe düz string alanlara dönüştürür. */
export function normalizeMakeWebhookPayload(
  payload: GeoWebhookPayload,
): GeoWebhookPayload {
  return {
    campaignId: sanitizeWebhookField(payload.campaignId),
    baslik: sanitizeWebhookField(payload.baslik),
    icerik: sanitizeWebhookField(payload.icerik),
    slug: sanitizeWebhookField(payload.slug),
    markaAdi: sanitizeWebhookField(payload.markaAdi),
    sehir: sanitizeWebhookField(payload.sehir),
    sektor: sanitizeWebhookField(payload.sektor),
    agresiflik: sanitizeWebhookField(payload.agresiflik),
  };
}

/**
 * Make.com webhook gövdesini yalnızca JSON.stringify ile üretir ve geçerliliğini doğrular.
 * Manuel string birleştirme kullanılmaz.
 */
export function serializeMakeWebhookPayload(payload: GeoWebhookPayload): string {
  const normalized = normalizeMakeWebhookPayload(payload);

  for (const field of WEBHOOK_STRING_FIELDS) {
    if (typeof normalized[field] !== "string") {
      throw new TypeError(`Make webhook alanı string olmalı: ${field}`);
    }
  }

  let body: string;

  try {
    body = JSON.stringify(normalized);
  } catch (error) {
    throw new Error("Make webhook payload JSON.stringify başarısız.", {
      cause: error,
    });
  }

  try {
    JSON.parse(body);
  } catch (error) {
    throw new Error("Make webhook payload geçerli JSON değil.", {
      cause: error,
    });
  }

  return body;
}

export const MAKE_WEBHOOK_CONTENT_TYPE = "application/json; charset=utf-8";
