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
export const LIVE_LLM_CORPORATE_FALLBACK_MAX = 28;
export const LIVE_LLM_BASELINE_START_RATE_MIN = 3;
export const LIVE_LLM_BASELINE_START_RATE_MAX = 6;

const CORPORATE_PRESTIGE_PATTERN =
  /otel|hotel|resort|hastane|hospital|klinik|clinic|radisson|hilton|marriott|hyatt|sheraton|crowne|intercontinental|ibis|novotel|mandarin|four\s*seasons|conrad|doubletree|holiday\s*inn|best\s*western|ramada|dedeman|rixos|swissotel|fairmont|sofitel|wyndham|accor/i;

export function hasCorporatePrestigeSignal(
  businessName: string,
  category?: string,
): boolean {
  const combined = `${businessName} ${category ?? ""}`.trim();
  if (!combined) {
    return false;
  }

  if (CORPORATE_PRESTIGE_PATTERN.test(combined)) {
    return true;
  }

  const slug = slugifyBusinessMatchKey(combined);
  return (
    slug.includes("otel") ||
    slug.includes("hotel") ||
    slug.includes("hastane") ||
    slug.includes("hospital") ||
    slug.includes("klinik") ||
    slug.includes("clinic") ||
    slug.includes("resort")
  );
}

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

/** LLM eşleşmesine göre başlangıç önerilme oranı (%). */
export function resolveStartRateFromLlmPresence(
  mentioned: boolean,
  businessName: string,
  options: StartRateResolutionOptions = {},
): number {
  const hash = hashBusinessSeed(businessName);
  const category = options.category;

  if (mentioned) {
    const span = LIVE_LLM_ORGANIC_START_RATE_MAX - LIVE_LLM_ORGANIC_START_RATE_MIN;
    return LIVE_LLM_ORGANIC_START_RATE_MIN + (hash % (span + 1));
  }

  if (hasCorporatePrestigeSignal(businessName, category)) {
    const span =
      LIVE_LLM_CORPORATE_FALLBACK_MAX - LIVE_LLM_CORPORATE_FALLBACK_MIN;
    return LIVE_LLM_CORPORATE_FALLBACK_MIN + (hash % (span + 1));
  }

  const span = LIVE_LLM_BASELINE_START_RATE_MAX - LIVE_LLM_BASELINE_START_RATE_MIN;
  return LIVE_LLM_BASELINE_START_RATE_MIN + (hash % (span + 1));
}
