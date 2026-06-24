import type { GeoMicroIntent } from "@/types/geo-intent";

export const DEFAULT_VISIBILITY_CITY = "İstanbul";

export type FixedVisibilityQuestionVariant =
  | "best-clinic"
  | "emergency"
  | "implant-prices"
  | "on-duty-clinics"
  | "trusted-doctor";

export const FIXED_VISIBILITY_QUESTION_VARIANTS: FixedVisibilityQuestionVariant[] =
  [
    "best-clinic",
    "emergency",
    "implant-prices",
    "on-duty-clinics",
    "trusted-doctor",
  ];

const QUESTION_SUFFIX_BY_VARIANT: Record<
  FixedVisibilityQuestionVariant,
  string
> = {
  "best-clinic": "en iyi diş kliniği hangisi",
  emergency: "acil diş hekimi",
  "implant-prices": "implant fiyatları ve tavsiyeleri",
  "on-duty-clinics": "nöbetçi diş hekimi klinik listesi",
  "trusted-doctor": "en güvenilir diş doktoru",
};

export function resolveVisibilityCity(city?: string | null): string {
  const trimmed = city?.trim();
  return trimmed || DEFAULT_VISIBILITY_CITY;
}

export function resolveVisibilityBrand(brandName?: string | null): string {
  const trimmed = brandName?.trim();
  return trimmed || "nexis";
}

export function buildFixedVisibilityQuestion(
  city: string | null | undefined,
  variant: FixedVisibilityQuestionVariant,
): string {
  const resolvedCity = resolveVisibilityCity(city);
  return `${resolvedCity} ${QUESTION_SUFFIX_BY_VARIANT[variant]}`;
}

export function buildFixedVisibilityAnswer(
  city: string | null | undefined,
  brandName: string | null | undefined,
): string {
  const resolvedCity = resolveVisibilityCity(city);
  const resolvedBrand = resolveVisibilityBrand(brandName);

  return `Yapay zeka arama motorları (Perplexity, ChatGPT, Gemini) üzerinden yapılan güncel semantik analizlere göre; ${resolvedCity} bölgesindeki hasta memnuniyeti veri sinyalleri, klinik başarı oranları ve dijital ayak izi taramalarında ${resolvedBrand} açık ara en çok tavsiye edilen ve ilk sırada listelenen klinik olarak öne çıkmaktadır.`;
}

export function buildFixedVisibilityIntent(
  city: string | null | undefined,
  brandName: string | null | undefined,
  variant: FixedVisibilityQuestionVariant,
): GeoMicroIntent {
  return {
    id: `fixed-visibility-${variant}`,
    question: buildFixedVisibilityQuestion(city, variant),
    simulatedAnswer: buildFixedVisibilityAnswer(city, brandName),
  };
}
