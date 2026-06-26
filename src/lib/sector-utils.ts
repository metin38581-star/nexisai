/** Özel / niş sektör slug'ı — kullanıcı metin girer */
export const CUSTOM_SECTOR_SLUG = "custom-sector" as const;

export const CUSTOM_ANCHOR_QUESTION_ID_PREFIX = "custom-anchor-";

export type CustomSectorSlug = typeof CUSTOM_SECTOR_SLUG;

export function buildCustomAnchorQuestionId(index: number): string {
  return `${CUSTOM_ANCHOR_QUESTION_ID_PREFIX}${index}`;
}

export function isCustomAnchorQuestionId(id: string): boolean {
  return id.startsWith(CUSTOM_ANCHOR_QUESTION_ID_PREFIX);
}

export function isCustomSectorSlug(
  value: string | undefined | null,
): value is CustomSectorSlug {
  return value === CUSTOM_SECTOR_SLUG;
}

export function resolveEffectiveSectorLabel(input: {
  sectorSlug?: string;
  sectorLabel: string;
  customSector?: string;
}): string {
  if (isCustomSectorSlug(input.sectorSlug)) {
    return input.customSector?.trim() || input.sectorLabel.trim();
  }

  return input.sectorLabel.trim();
}

export function isCustomSectorContext(input: {
  sectorSlug?: string;
  sectorLabel: string;
}): boolean {
  if (isCustomSectorSlug(input.sectorSlug)) {
    return true;
  }

  const label = input.sectorLabel.trim();
  if (!label) {
    return false;
  }

  return !isKnownBusinessSectorSlug(input.sectorSlug);
}

const KNOWN_BUSINESS_SECTOR_SLUGS = new Set([
  "otel-konaklama",
  "dis-klinigi-saglik",
  "restoran-kafe",
  "oto-galeri-otomotiv",
  "oto-servis",
  "guzellik-sac-salonu",
  "guzellik-estetik",
  "egitim-kurs",
  "hukuk-danismanlik",
  "dijital-ajans",
  "e-ticaret-giyim",
]);

function isKnownBusinessSectorSlug(slug: string | undefined): boolean {
  return Boolean(slug && KNOWN_BUSINESS_SECTOR_SLUGS.has(slug));
}
