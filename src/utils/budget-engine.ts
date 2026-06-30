import {
  AUTOPILOT_MAX_TARGET_RECOMMENDATION_RATE,
  AUTOPILOT_MAX_VISIBILITY_DELTA,
  AUTOPILOT_OPERATION_COST_PER_QUESTION_TL,
  AUTOPILOT_TOLERANCE_GRANT_THRESHOLD_TL,
  AUTOPILOT_VISIBILITY_GAIN_PER_QUESTION_MAX,
  AUTOPILOT_VISIBILITY_GAIN_PER_QUESTION_MIN,
  type AutopilotBudgetInput,
  type AutopilotBudgetResult,
  type AutopilotRecommendationMetrics,
  type AutopilotVisibilityForecastInternal,
} from "@/types/campaign";

export {
  AUTOPILOT_OPERATION_COST_PER_QUESTION_TL,
  AUTOPILOT_TOLERANCE_GRANT_THRESHOLD_TL,
  AUTOPILOT_VISIBILITY_GAIN_PER_QUESTION_MIN,
  AUTOPILOT_VISIBILITY_GAIN_PER_QUESTION_MAX,
  AUTOPILOT_MAX_VISIBILITY_DELTA,
  AUTOPILOT_MAX_TARGET_RECOMMENDATION_RATE,
};

export interface BudgetEngineOptions {
  operationCostPerQuestion?: number;
  toleranceThreshold?: number;
}

export interface VisibilityForecastInput {
  publishCount: number;
  currentRecommendationRate?: number;
  /** Başlangıç oranı simülasyonu için deterministik seed (kampanyaId vb.) */
  campaignSeed?: string;
}

export interface VisibilityForecastResult {
  metrics: AutopilotRecommendationMetrics;
  internal: AutopilotVisibilityForecastInternal;
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

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function roundRate(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Ölçüm yoksa kampanya seed'inden simüle başlangıç oranı (%3–%8 aralığı).
 */
export function simulateCurrentRecommendationRate(campaignSeed: string): number {
  const hash = hashSeed(campaignSeed);
  return 3 + (hash % 6);
}

/**
 * Her içerik/soru +%1.0 ile +%1.2 arası katkı sağlar (deterministik, seed'li).
 * Toplam artış 85 puan ile sınırlıdır.
 */
export function calculateVisibilityDeltaFromPublishCount(
  publishCount: number,
  campaignSeed = "nexisai-default",
): number {
  const safeCount = Math.max(0, Math.floor(publishCount));
  if (safeCount === 0) {
    return 0;
  }

  const span =
    AUTOPILOT_VISIBILITY_GAIN_PER_QUESTION_MAX -
    AUTOPILOT_VISIBILITY_GAIN_PER_QUESTION_MIN;
  let total = 0;

  for (let index = 0; index < safeCount; index += 1) {
    const hash = hashSeed(`${campaignSeed}:visibility:${index}`);
    const gain =
      AUTOPILOT_VISIBILITY_GAIN_PER_QUESTION_MIN +
      (hash % Math.round(span * 100 + 1)) / 100;
    total += gain;
  }

  return Math.min(AUTOPILOT_MAX_VISIBILITY_DELTA, roundRate(total));
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

/** Günlük yayın hedefi: publishCount / totalDays (kalan günler +1 alır). */
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

export function formatAutopilotCorporatePanelNarrative(
  baselineRate: number,
  targetRate: number,
): string {
  return `İşletmenizin şu an yapay zekalarda (ChatGPT, Gemini) önerilme oranı %${roundRate(baselineRate)}'tir. Belirlediğiniz gün ve bütçe planlaması ile tahmini önerilme oranınız %${roundRate(targetRate)}'ye çıkarılacaktır. Yapay zeka tavsiye motorları markanızı öncelikli referans listesine almak üzere optimize edilecektir.`;
}

export function formatCorporateRecommendationHeadline(
  baselineRate: number,
  targetRate: number,
): string {
  return `Yapay Zeka Öneri Oranı (%${roundRate(baselineRate)}'ten %${roundRate(targetRate)}'ye yükseltilecektir)`;
}

export function formatCorporateVisibilityNarrative(
  baselineRate: number,
  targetRate: number,
): string {
  return `İşletmenizin şu an yapay zekalarda önerilme oranı %${roundRate(baselineRate)}'tir. Bu bütçe ve gün planlaması ile tahmini önerilme oranınız %${roundRate(targetRate)}'e çıkarılacaktır.`;
}

/** @deprecated formatCorporateRecommendationHeadline kullanın */
export function formatCorporateRecommendationMessage(
  baselineRate: number,
  targetRate: number,
): string {
  return formatCorporateRecommendationHeadline(baselineRate, targetRate);
}

/**
 * Skor odaklı görünürlük tahmin motoru.
 * Kullanıcıya asla içerik/soru adedi veya ham +%X artış ifadesi gösterilmez.
 */
export function calculateAutopilotVisibilityForecast(
  input: VisibilityForecastInput,
): VisibilityForecastResult {
  const publishCount = Math.max(0, Math.floor(input.publishCount));
  const campaignSeed = input.campaignSeed ?? "nexisai-default";

  const currentRecommendationRate = roundRate(
    input.currentRecommendationRate ??
      simulateCurrentRecommendationRate(campaignSeed),
  );

  const visibilityDelta = calculateVisibilityDeltaFromPublishCount(
    publishCount,
    campaignSeed,
  );

  const averageGainPerQuestion =
    publishCount > 0 ? roundRate(visibilityDelta / publishCount) : 0;

  const projectedRecommendationRate = roundRate(
    Math.min(
      AUTOPILOT_MAX_TARGET_RECOMMENDATION_RATE,
      currentRecommendationRate + visibilityDelta,
    ),
  );

  const baselineRecommendationRate = currentRecommendationRate;
  const targetRecommendationRate = projectedRecommendationRate;

  const corporateSummary = formatCorporateRecommendationHeadline(
    baselineRecommendationRate,
    targetRecommendationRate,
  );

  const corporateNarrative = formatCorporateVisibilityNarrative(
    baselineRecommendationRate,
    targetRecommendationRate,
  );

  return {
    metrics: {
      baselineRecommendationRate,
      targetRecommendationRate,
      corporateSummary,
      corporateNarrative,
    },
    internal: {
      publishCount,
      visibilityDelta,
      averageGainPerQuestion,
      currentRecommendationRate,
      projectedRecommendationRate,
    },
  };
}

/** Bütçe + görünürlük tahminini tek adımda üretir. */
export function calculateAutopilotBudgetWithForecast(
  budgetInput: AutopilotBudgetInput,
  forecastInput: Omit<VisibilityForecastInput, "publishCount"> = {},
  options: BudgetEngineOptions = {},
): {
  budget: AutopilotBudgetResult;
  forecast: VisibilityForecastResult;
} {
  const budget = calculateAutopilotBudget(budgetInput, options);
  const forecast = calculateAutopilotVisibilityForecast({
    ...forecastInput,
    publishCount: budget.publishCount,
  });

  return { budget, forecast };
}
