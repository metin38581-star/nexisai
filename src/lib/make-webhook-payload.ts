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

/** Make.com JSON parser'ının reddettiği kontrol / ayırıcı karakterler. */
const MAKE_JSON_UNSAFE_CHARS =
  /[\u0000-\u001F\u007F-\u009F\u2028\u2029\uFEFF]/g;

const MAX_ICERIK_CHARS = 120_000;

function toWellFormedString(text: string): string {
  if (typeof text.toWellFormed === "function") {
    return text.toWellFormed();
  }

  return text;
}

/**
 * JSON.stringify öncesi alanları temizler.
 * Ham satır sonları, tab ve kontrol karakterleri kaldırılır — Make.com
 * "bad control character in string literal" hatası vermemesi için.
 */
export function sanitizeWebhookField(value: unknown): string {
  const text = toWellFormedString(value == null ? "" : String(value));

  return text
    .replace(MAKE_JSON_UNSAFE_CHARS, " ")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeIcerikField(value: unknown): string {
  const text = toWellFormedString(value == null ? "" : String(value));

  let sanitized = text
    .replace(MAKE_JSON_UNSAFE_CHARS, " ")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();

  if (sanitized.length > MAX_ICERIK_CHARS) {
    sanitized = sanitized.slice(0, MAX_ICERIK_CHARS);
  }

  return sanitized;
}

/** Webhook payload nesnesini JSON-safe düz string alanlara dönüştürür. */
export function normalizeMakeWebhookPayload(
  payload: GeoWebhookPayload,
): GeoWebhookPayload {
  return {
    campaignId: sanitizeWebhookField(payload.campaignId),
    baslik: sanitizeWebhookField(payload.baslik),
    icerik: sanitizeIcerikField(payload.icerik),
    slug: sanitizeWebhookField(payload.slug),
    markaAdi: sanitizeWebhookField(payload.markaAdi),
    sehir: sanitizeWebhookField(payload.sehir),
    sektor: sanitizeWebhookField(payload.sektor),
    agresiflik: sanitizeWebhookField(payload.agresiflik),
  };
}

/** Sıkı JSON gövdesinde ham kontrol karakteri kalmadığını doğrular. */
export function assertStrictJsonTransportBody(body: string): void {
  JSON.parse(body);

  for (let index = 0; index < body.length; index += 1) {
    const code = body.charCodeAt(index);
    if (code < 0x20) {
      throw new Error(
        `Make webhook JSON gövdesinde ham kontrol karakteri (0x${code.toString(16)}) — pozisyon ${index}.`,
      );
    }
  }
}

export interface MakeWebhookRequestBody {
  /** UTF-8 JSON string — fetch body olarak kullanılır. */
  json: string;
  /** Doğrulama / log için byte uzunluğu. */
  byteLength: number;
}

/**
 * Make.com webhook gövdesini yalnızca JSON.stringify ile üretir.
 * Manuel string birleştirme kullanılmaz.
 */
export function buildMakeWebhookRequestBody(
  payload: GeoWebhookPayload,
): MakeWebhookRequestBody {
  const normalized = normalizeMakeWebhookPayload(payload);

  for (const field of WEBHOOK_STRING_FIELDS) {
    if (typeof normalized[field] !== "string") {
      throw new TypeError(`Make webhook alanı string olmalı: ${field}`);
    }
  }

  let json: string;

  try {
    json = JSON.stringify(normalized);
  } catch (error) {
    throw new Error("Make webhook payload JSON.stringify başarısız.", {
      cause: error,
    });
  }

  assertStrictJsonTransportBody(json);

  return {
    json,
    byteLength: new TextEncoder().encode(json).byteLength,
  };
}

/** @deprecated buildMakeWebhookRequestBody kullanın. */
export function serializeMakeWebhookPayload(payload: GeoWebhookPayload): string {
  return buildMakeWebhookRequestBody(payload).json;
}

export const MAKE_WEBHOOK_CONTENT_TYPE = "application/json; charset=utf-8";
