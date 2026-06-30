import {
  AUTOPILOT_OPERATION_COST_PER_QUESTION_TL,
  AUTOPILOT_TOLERANCE_GRANT_THRESHOLD_TL,
  type AutopilotBudgetInput,
  type AutopilotBudgetResult,
} from "@/types/campaign";

export {
  AUTOPILOT_OPERATION_COST_PER_QUESTION_TL,
  AUTOPILOT_TOLERANCE_GRANT_THRESHOLD_TL,
};

export interface BudgetEngineOptions {
  operationCostPerQuestion?: number;
  toleranceThreshold?: number;
}

function normalizePositiveInteger(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
}

function normalizeBudget(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.round(value * 100) / 100;
}

/**
 * NexisAI bütçe anayasası:
 * - totalBudget = dailyBudget × totalDays
 * - publishCount = floor(totalBudget / 500)
 * - 100 TL jest toleransı ile +1 soru hakkı
 */
export function calculateAutopilotBudget(
  input: AutopilotBudgetInput,
  options: BudgetEngineOptions = {},
): AutopilotBudgetResult {
  const operationCostPerQuestion =
    options.operationCostPerQuestion ?? AUTOPILOT_OPERATION_COST_PER_QUESTION_TL;
  const toleranceThreshold =
    options.toleranceThreshold ?? AUTOPILOT_TOLERANCE_GRANT_THRESHOLD_TL;

  const dailyBudget = normalizeBudget(input.dailyBudget);
  const totalDays = normalizePositiveInteger(input.totalDays, 1);
  const totalBudget = normalizeBudget(dailyBudget * totalDays);

  const basePublishCount = Math.floor(totalBudget / operationCostPerQuestion);
  const nextTierBudget = (basePublishCount + 1) * operationCostPerQuestion;
  const budgetShortfallToNextTier = Math.max(0, nextTierBudget - totalBudget);

  const toleranceApplied =
    basePublishCount >= 0 &&
    budgetShortfallToNextTier > 0 &&
    budgetShortfallToNextTier <= toleranceThreshold;

  const publishCount = basePublishCount + (toleranceApplied ? 1 : 0);

  return {
    dailyBudget,
    totalDays,
    totalBudget,
    operationCostPerQuestion,
    basePublishCount,
    publishCount,
    toleranceApplied,
    toleranceGrantAmount: toleranceApplied ? budgetShortfallToNextTier : 0,
    nextTierBudget,
    budgetShortfallToNextTier,
  };
}

/** Örnek doğrulama: 13.600 TL / 17 gün → 27 soru (500 TL taban, tolerans devreye girmez). */
export function calculateDailyQuestionTarget(
  publishCount: number,
  totalDays: number,
): { basePerDay: number; remainderDays: number } {
  const safeDays = Math.max(1, totalDays);
  const safeCount = Math.max(0, publishCount);
  const basePerDay = Math.floor(safeCount / safeDays);
  const remainderDays = safeCount % safeDays;
  return { basePerDay, remainderDays };
}

export function formatCorporateRecommendationMessage(
  baselineRate: number,
  targetRate: number,
): string {
  return `Yapay Zeka Öneri Oranı (%${baselineRate}'ten %${targetRate}'ye)`;
}
