import { resolveMaxQuestionsFromDailyBudget } from "@/lib/intent-soft-cap";
import { resolveBudgetOperationTier } from "@/lib/budget-operation-tiers";

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
  const tier = resolveBudgetOperationTier(dailyBudget);

  return {
    dailyBudget,
    publishCount: autonomousTargetCount,
    autonomousTargetCount,
    label: tier.tierLabel,
    description: `${autonomousTargetCount} bağımsız makale · ${tier.engines.map((e) => e.name.split(" ")[0]).join(" + ")} motorlarıyla arka planda üretilip yayınlanacak.`,
  };
}
