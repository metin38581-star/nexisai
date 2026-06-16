import { resolveMaxQuestionsFromDailyBudget } from "@/lib/intent-soft-cap";

export interface ContentVolumePlan {
  dailyBudget: number;
  publishCount: number;
  autonomousTargetCount: number;
  label: string;
  description: string;
}

/** Günlük bütçeye göre otonom yayınlanacak içerik hacmi. */
export function resolveContentVolumePlan(
  dailyBudget: number,
): ContentVolumePlan {
  const autonomousTargetCount = resolveMaxQuestionsFromDailyBudget(dailyBudget);

  if (dailyBudget > 300) {
    return {
      dailyBudget,
      publishCount: autonomousTargetCount,
      autonomousTargetCount,
      label: "Dominasyon Modu",
      description: `${autonomousTargetCount} bağımsız makale arka planda üretilip yayınlanacak.`,
    };
  }

  if (dailyBudget > 150) {
    return {
      dailyBudget,
      publishCount: autonomousTargetCount,
      autonomousTargetCount,
      label: "Agresif Mod",
      description: `${autonomousTargetCount} otonom hedef için makale üretilecek.`,
    };
  }

  if (dailyBudget > 50) {
    return {
      dailyBudget,
      publishCount: autonomousTargetCount,
      autonomousTargetCount,
      label: "Büyüme Modu",
      description: `${autonomousTargetCount} otonom hedef için makale üretilecek.`,
    };
  }

  return {
    dailyBudget,
    publishCount: autonomousTargetCount,
    autonomousTargetCount,
    label: "Keşif Modu",
    description: `${autonomousTargetCount} otonom hedef üretilecek — bütçeyi artırarak derinliği yükseltin.`,
  };
}
