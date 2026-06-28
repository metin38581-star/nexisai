import type { BusinessSector } from "@/types/campaign";
import {
  calculateMaxQuestions,
  CORE_QUESTIONS,
  GOLD_QUESTION_BUDGET_THRESHOLD,
  GOLD_QUESTIONS_PER_SECTOR,
  isGoldQuestionId,
  isGoldQuestionBudgetUnlocked,
  type CoreQuestionSector,
  type QuestionTemplate,
} from "@/constants/campaign";
import { EXTENDED_SECTOR_LABELS } from "@/constants/sector-data";
import { enrichPlainTextWithAuthorityLink } from "@/lib/business-domain";
import type { SelectedQuestionPair } from "@/lib/selected-questions";
import { buildFallbackSimulatedAnswer } from "@/lib/selected-questions";

const SECTOR_SLUG_TO_CORE: Partial<Record<BusinessSector, CoreQuestionSector>> = {
  "dis-klinigi-saglik": "clinic",
  "otel-konaklama": "hotel",
  "restoran-kafe": "restaurant",
  "guzellik-estetik": "guzellik_estetik",
  "hukuk-danismanlik": "avukatlik_hukuk",
  "evden-eve-nakliyat": "evden_eve_nakliyat",
  "hali-yikama": "hali_yikama",
  "oto-servis-ekspertiz": "oto_servis_ekspertiz",
  "surucu-kursu": "surucu_kursu",
  "egitim-kurs": "egitim_kurs",
  "dijital-ajans": "dijital_ajans",
  "oto-galeri-otomotiv": "oto_galeri_otomotiv",
  "guzellik-sac-salonu": "guzellik_sac_salonu",
  "e-ticaret-giyim": "eticaret_giyim",
};

const CORE_SECTOR_LABELS: Record<CoreQuestionSector, string> = {
  clinic: "Diş Kliniği & Sağlık",
  hotel: "Otel & Konaklama",
  restaurant: "Restoran & Kafe",
  ...EXTENDED_SECTOR_LABELS,
};

const CORE_TO_BUSINESS_SECTOR: Record<CoreQuestionSector, BusinessSector> = {
  clinic: "dis-klinigi-saglik",
  hotel: "otel-konaklama",
  restaurant: "restoran-kafe",
  guzellik_estetik: "guzellik-estetik",
  avukatlik_hukuk: "hukuk-danismanlik",
  evden_eve_nakliyat: "evden-eve-nakliyat",
  hali_yikama: "hali-yikama",
  oto_servis_ekspertiz: "oto-servis-ekspertiz",
  surucu_kursu: "surucu-kursu",
  egitim_kurs: "egitim-kurs",
  dijital_ajans: "dijital-ajans",
  oto_galeri_otomotiv: "oto-galeri-otomotiv",
  guzellik_sac_salonu: "guzellik-sac-salonu",
  eticaret_giyim: "e-ticaret-giyim",
};

export function resolveBusinessSectorFromCore(
  coreSector: CoreQuestionSector,
): BusinessSector {
  return CORE_TO_BUSINESS_SECTOR[coreSector];
}

export const CORE_QUESTION_SUPPORTED_SECTORS: BusinessSector[] = Object.values(
  CORE_TO_BUSINESS_SECTOR,
);

export const CORE_QUESTION_SUPPORTED_LABELS_TEXT =
  CORE_QUESTION_SUPPORTED_SECTORS.map((slug) => {
    const core = SECTOR_SLUG_TO_CORE[slug];
    return core ? CORE_SECTOR_LABELS[core] : slug;
  }).join(", ");

export function isCoreQuestionSectorSupported(
  sector: BusinessSector | "",
): sector is BusinessSector {
  return Boolean(sector && CORE_QUESTION_SUPPORTED_SECTORS.includes(sector));
}

export function resolveCoreQuestionSector(
  sectorSlug: BusinessSector | "",
): CoreQuestionSector | null {
  if (!sectorSlug) {
    return null;
  }

  return SECTOR_SLUG_TO_CORE[sectorSlug] ?? null;
}

export function resolveCoreQuestionSectorFromLabel(
  sectorLabel: string,
): CoreQuestionSector | null {
  const normalized = sectorLabel.trim().toLowerCase();

  for (const [coreSector, label] of Object.entries(CORE_SECTOR_LABELS)) {
    if (label.toLowerCase() === normalized) {
      return coreSector as CoreQuestionSector;
    }
  }

  for (const [slug, coreSector] of Object.entries(SECTOR_SLUG_TO_CORE)) {
    if (slug.replace(/-/g, " ").includes(normalized.split(" ")[0] ?? "")) {
      return coreSector ?? null;
    }
  }

  return null;
}

export function getCoreQuestionsForSector(
  sector: CoreQuestionSector,
): QuestionTemplate[] {
  return CORE_QUESTIONS.filter((question) => question.sector === sector);
}

export function getCoreQuestionPoolSize(sectorSlug: BusinessSector | ""): number {
  const coreSector = resolveCoreQuestionSector(sectorSlug);
  if (!coreSector) {
    return 0;
  }

  return getCoreQuestionsForSector(coreSector).length;
}

export function resolveMaxSelection(
  budget: number,
  sectorSlug: BusinessSector | "",
): number {
  const poolSize = getCoreQuestionPoolSize(sectorSlug);
  if (poolSize === 0 || budget < 100) {
    return 0;
  }

  return Math.min(calculateMaxQuestions(budget), poolSize);
}

export function fillQuestionTemplate(template: string, city: string): string {
  const cityLabel = city.trim() || "Şehriniz";
  return template.replace(/\[Şehir\]/g, cityLabel);
}

export function resolveCoreQuestionById(id: string): QuestionTemplate | null {
  return CORE_QUESTIONS.find((question) => question.id === id) ?? null;
}

export function buildCoreQuestionPairs(
  selectedIds: string[],
  sectorSlug: BusinessSector,
  cityLabel: string,
  brandName: string,
  sectorLabel: string,
  businessDomain?: string | null,
): SelectedQuestionPair[] {
  const coreSector = resolveCoreQuestionSector(sectorSlug);
  if (!coreSector) {
    return [];
  }

  const allowedIds = new Set(
    getCoreQuestionsForSector(coreSector).map((question) => question.id),
  );

  return selectedIds
    .filter((id) => allowedIds.has(id))
    .map((id) => {
      const template = resolveCoreQuestionById(id);
      if (!template) {
        return null;
      }

      const question = fillQuestionTemplate(template.template, cityLabel);

      const simulatedAnswer = enrichPlainTextWithAuthorityLink(
        buildFallbackSimulatedAnswer(
          question,
          brandName,
          cityLabel,
          sectorLabel,
        ),
        brandName,
        cityLabel,
        sectorLabel,
        businessDomain,
      );

      return {
        question,
        simulatedAnswer,
      };
    })
    .filter((pair): pair is SelectedQuestionPair => pair !== null);
}

export interface CoreQuestionValidationResult {
  ok: boolean;
  maxSelection: number;
  error?: string;
  statusCode?: number;
}

export function validateGoldQuestionBudgetAccess(input: {
  budget: number;
  selectedIds: string[];
}): CoreQuestionValidationResult | null {
  if (isGoldQuestionBudgetUnlocked(input.budget)) {
    return null;
  }

  const hasGoldSelection = input.selectedIds.some((id) => isGoldQuestionId(id));
  if (!hasGoldSelection) {
    return null;
  }

  return {
    ok: false,
    maxSelection: resolveMaxSelection(input.budget, ""),
    statusCode: 403,
    error: "403 Forbidden - Altın Soru Yetkisiz Bütçe İhlali",
  };
}

export function validateCoreQuestionSelection(input: {
  budget: number;
  sectorSlug: BusinessSector | "";
  selectedIds: string[];
}): CoreQuestionValidationResult {
  const maxSelection = resolveMaxSelection(input.budget, input.sectorSlug);

  const goldViolation = validateGoldQuestionBudgetAccess({
    budget: input.budget,
    selectedIds: input.selectedIds,
  });
  if (goldViolation) {
    return { ...goldViolation, maxSelection };
  }

  if (!isCoreQuestionSectorSupported(input.sectorSlug)) {
    return {
      ok: false,
      maxSelection: 0,
      error: "Seçilen sektör için kemik soru havuzu bulunmuyor.",
    };
  }

  if (input.budget < 100) {
    return {
      ok: false,
      maxSelection: 0,
      error: "Günlük bütçe en az 100 TL olmalıdır.",
    };
  }

  if (maxSelection < 1) {
    return {
      ok: false,
      maxSelection: 0,
      error: "Bu bütçe ile soru seçimi yapılamaz.",
    };
  }

  if (input.selectedIds.length === 0) {
    return {
      ok: false,
      maxSelection,
      error: "En az bir kemik soru seçmelisiniz.",
    };
  }

  if (input.selectedIds.length > maxSelection) {
    return {
      ok: false,
      maxSelection,
      error: `Bütçeniz en fazla ${maxSelection} soru seçmenize izin veriyor. ${input.selectedIds.length} soru seçildi.`,
    };
  }

  const coreSector = resolveCoreQuestionSector(input.sectorSlug);
  const allowedIds = new Set(
    getCoreQuestionsForSector(coreSector!).map((question) => question.id),
  );

  const invalidId = input.selectedIds.find((id) => !allowedIds.has(id));
  if (invalidId) {
    return {
      ok: false,
      maxSelection,
      error: "Geçersiz veya sektörle uyuşmayan soru seçimi tespit edildi.",
    };
  }

  const uniqueIds = new Set(input.selectedIds);
  if (uniqueIds.size !== input.selectedIds.length) {
    return {
      ok: false,
      maxSelection,
      error: "Aynı soru birden fazla kez seçilemez.",
    };
  }

  return { ok: true, maxSelection };
}

export function pickDefaultCoreQuestionIds(
  sectorSlug: BusinessSector | "",
  budget: number,
): string[] {
  const coreSector = resolveCoreQuestionSector(sectorSlug);
  if (!coreSector) {
    return [];
  }

  const maxSelection = resolveMaxSelection(budget, sectorSlug);
  const pool = getCoreQuestionsForSector(coreSector);
  const goldIds = pool
    .filter((question) => question.isGold)
    .map((question) => question.id);
  const poolIds = pool
    .filter((question) => !question.isGold)
    .map((question) => question.id);

  const ordered = isGoldQuestionBudgetUnlocked(budget)
    ? [...goldIds, ...poolIds]
    : poolIds;

  return ordered.slice(0, maxSelection);
}

export {
  GOLD_QUESTIONS_PER_SECTOR,
  GOLD_QUESTION_BUDGET_THRESHOLD,
  isGoldQuestionId,
  isGoldQuestionBudgetUnlocked,
};
