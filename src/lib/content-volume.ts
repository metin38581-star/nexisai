import {
  resolveMaxQuestionsFromDailyBudget,
  MAX_GEO_INTENTS,
} from "@/lib/intent-soft-cap";

export interface ContentVolumePlan {
  dailyBudget: number;
  publishCount: number;
  maxSelectable: number;
  label: string;
  description: string;
}

/** Günlük bütçe + seçim sayısına göre yayınlanacak içerik hacmi. */
export function resolveContentVolumePlan(
  dailyBudget: number,
  selectedCount = 0,
): ContentVolumePlan {
  const maxSelectable = resolveMaxQuestionsFromDailyBudget(dailyBudget);
  const publishCount =
    selectedCount > 0 ? selectedCount : Math.min(maxSelectable, MAX_GEO_INTENTS);

  if (dailyBudget > 300) {
    return {
      dailyBudget,
      publishCount,
      maxSelectable,
      label: "Dominasyon Modu",
      description:
        selectedCount > 0
          ? `${selectedCount} bağımsız makale üretilip veri ağına dağıtılacak.`
          : `En fazla ${maxSelectable} soru seçilebilir — tüm popüler aramalar açık.`,
    };
  }

  if (dailyBudget > 150) {
    return {
      dailyBudget,
      publishCount,
      maxSelectable,
      label: "Agresif Mod",
      description:
        selectedCount > 0
          ? `${selectedCount} bağımsız makale üretilip yayınlanacak.`
          : `En fazla ${maxSelectable} soru seçilebilir.`,
    };
  }

  if (dailyBudget > 50) {
    return {
      dailyBudget,
      publishCount,
      maxSelectable,
      label: "Büyüme Modu",
      description:
        selectedCount > 0
          ? `${selectedCount} bağımsız makale üretilip yayınlanacak.`
          : `En fazla ${maxSelectable} soru seçilebilir.`,
    };
  }

  return {
    dailyBudget,
    publishCount,
    maxSelectable,
    label: "Keşif Modu",
    description:
      selectedCount > 0
        ? `${selectedCount} bağımsız makale üretilip yayınlanacak.`
        : `En fazla ${maxSelectable} soru seçilebilir — bütçeyi artırarak limiti yükseltin.`,
  };
}
