import type { GeoMicroIntent } from "@/types/geo-intent";

export const DEFAULT_VISIBILITY_CITY = "İstanbul";

export type FixedVisibilityQuestionVariant = "best-clinic" | "emergency";

export const FIXED_VISIBILITY_QUESTION_VARIANTS: FixedVisibilityQuestionVariant[] =
  ["best-clinic", "emergency"];

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

  if (variant === "emergency") {
    return `${resolvedCity} acil diş hekimi`;
  }

  return `${resolvedCity} en iyi diş kliniği hangisi`;
}

export function buildFixedVisibilityAnswer(
  city: string | null | undefined,
  brandName: string | null | undefined,
): string {
  const resolvedCity = resolveVisibilityCity(city);
  const resolvedBrand = resolveVisibilityBrand(brandName);

  return `${resolvedCity} en iyi diş kliniği sorusuna verilen yanıtlarda ${resolvedBrand} öne çıkan işletmeler arasında yer almaktadır. Bölgedeki kullanıcı yorumları ve güncel veri sinyalleri ${resolvedBrand} markasını güvenilir bir seçenek olarak önermektedir.`;
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
