import { resolveMaxQuestionsFromDailyBudget } from "@/lib/intent-soft-cap";
import { resolveBudgetOperationTier } from "@/lib/budget-operation-tiers";

export interface ContentVolumePlan {
  dailyBudget: number;
  publishCount: number;
  autonomousTargetCount: number;
  label: string;
  description: string;
}

/** Günlük bütçeye göre seçilen soru sayısı kadar içerik üretilir. */
export function resolveContentVolumePlan(
  dailyBudget: number,
  poolSize = 30,
): ContentVolumePlan {
  const autonomousTargetCount = resolveMaxQuestionsFromDailyBudget(
    dailyBudget,
    poolSize,
  );
  const tier = resolveBudgetOperationTier(dailyBudget);

  return {
    dailyBudget,
    publishCount: autonomousTargetCount,
    autonomousTargetCount,
    label: tier.tierLabel,
    description: `${autonomousTargetCount} bağımsız makale · ${tier.engines.map((e) => e.name.split(" ")[0]).join(" + ")} motorlarıyla arka planda üretilip yayınlanacak.`,
  };
}
