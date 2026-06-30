/**
 * İşletme adı ↔ LLM yanıtı eşleştirmesi için compact slug anahtarı.
 * Örn: "City One" → cityone, "City One Hotel" metni → ...cityonehotel...
 */
export function slugifyBusinessMatchKey(value: string): string {
  return value
    .replace(/\u0131/g, "i")
    .replace(/\u0130/g, "i")
    .replace(/I/g, "i")
    .replace(/Ğ/g, "g")
    .replace(/ğ/g, "g")
    .replace(/Ş/g, "s")
    .replace(/ş/g, "s")
    .replace(/Ç/g, "c")
    .replace(/ç/g, "c")
    .replace(/Ö/g, "o")
    .replace(/ö/g, "o")
    .replace(/Ü/g, "u")
    .replace(/ü/g, "u")
    .toLocaleLowerCase("en-US")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeBrandNameForWordCheck(value: string): string {
  return value
    .replace(/\u0131/g, "i")
    .replace(/\u0130/g, "i")
    .replace(/I/g, "i")
    .toLocaleLowerCase("en-US");
}

/** Sadece işletme adı içinde geçen kurumsal unvan kelimeleri — sektör dahil edilmez. */
const CORPORATE_BRAND_TITLE_WORDS = [
  "otel",
  "hotel",
  "resort",
  "hastane",
  "hospital",
  "avm",
  "klinik",
  "clinic",
  "radisson",
  "hilton",
  "marriott",
  "hyatt",
  "sheraton",
  "intercontinental",
  "ibis",
  "novotel",
  "mandarin",
  "conrad",
  "dedeman",
  "rixos",
  "swissotel",
  "fairmont",
  "sofitel",
  "wyndham",
] as const;

/**
 * mentioned=false fallback için: kurumsal zırh puanı yalnızca işletme adında
 * otel/hotel/hastane/avm vb. fiziksel olarak geçiyorsa verilir.
 */
export function hasCorporateBrandTitleInBusinessName(businessName: string): boolean {
  const lowerName = normalizeBrandNameForWordCheck(businessName.trim());
  if (!lowerName) {
    return false;
  }

  return CORPORATE_BRAND_TITLE_WORDS.some((word) => lowerName.includes(word));
}

/** @deprecated Sektör bazlı kontrol kaldırıldı — hasCorporateBrandTitleInBusinessName kullanın. */
export function hasCorporatePrestigeSignal(
  businessName: string,
  _category?: string,
): boolean {
  return hasCorporateBrandTitleInBusinessName(businessName);
}

/** LLM yanıtında işletme adı geçiyor mu — slug tabanlı, boşluk/tire körü eşleşme. */
export function isBusinessNameMentionedInLlmResponse(
  response: string,
  businessName: string,
): boolean {
  const brandSlug = slugifyBusinessMatchKey(businessName);
  const responseSlug = slugifyBusinessMatchKey(response);

  if (brandSlug.length < 3 || !responseSlug) {
    return false;
  }

  if (responseSlug.includes(brandSlug)) {
    return true;
  }

  const minChunk = Math.min(4, brandSlug.length);
  if (minChunk >= 3 && brandSlug.length > minChunk) {
    const leadChunk = brandSlug.slice(0, Math.max(minChunk, brandSlug.length - 1));
    if (leadChunk.length >= 3 && responseSlug.includes(leadChunk)) {
      return true;
    }
  }

  return false;
}

export const LIVE_LLM_ORGANIC_START_RATE_MIN = 28;
export const LIVE_LLM_ORGANIC_START_RATE_MAX = 38;
export const LIVE_LLM_CORPORATE_FALLBACK_MIN = 22;
export const LIVE_LLM_CORPORATE_FALLBACK_MAX = 26;
export const LIVE_LLM_BASELINE_START_RATE_MIN = 3;
export const LIVE_LLM_BASELINE_START_RATE_MAX = 5;

function hashBusinessSeed(value: string): number {
  let hash = 2166136261;
  const slug = slugifyBusinessMatchKey(value);
  for (let index = 0; index < slug.length; index += 1) {
    hash ^= slug.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export interface StartRateResolutionOptions {
  category?: string;
  llmFailed?: boolean;
}

export type StartRateFallbackTier =
  | "organic_match"
  | "corporate_brand_title"
  | "sallama_floor";

/** LLM eşleşmesine göre başlangıç önerilme oranı (%). */
export function resolveStartRateFromLlmPresence(
  mentioned: boolean,
  businessName: string,
  _options: StartRateResolutionOptions = {},
): { startRate: number; fallbackTier: StartRateFallbackTier } {
  const hash = hashBusinessSeed(businessName);

  if (mentioned) {
    const span = LIVE_LLM_ORGANIC_START_RATE_MAX - LIVE_LLM_ORGANIC_START_RATE_MIN;
    return {
      startRate: LIVE_LLM_ORGANIC_START_RATE_MIN + (hash % (span + 1)),
      fallbackTier: "organic_match",
    };
  }

  if (hasCorporateBrandTitleInBusinessName(businessName)) {
    const span =
      LIVE_LLM_CORPORATE_FALLBACK_MAX - LIVE_LLM_CORPORATE_FALLBACK_MIN;
    return {
      startRate: LIVE_LLM_CORPORATE_FALLBACK_MIN + (hash % (span + 1)),
      fallbackTier: "corporate_brand_title",
    };
  }

  const span = LIVE_LLM_BASELINE_START_RATE_MAX - LIVE_LLM_BASELINE_START_RATE_MIN;
  return {
    startRate: LIVE_LLM_BASELINE_START_RATE_MIN + (hash % (span + 1)),
    fallbackTier: "sallama_floor",
  };
}
