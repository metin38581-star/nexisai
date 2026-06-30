import {
  AUTOPILOT_MAX_VISIBILITY_GROWTH_RATE,
  AUTOPILOT_MAX_VISIBILITY_GROWTH_RATE_FLOOR,
  AUTOPILOT_MIN_VISIBILITY_GROWTH_RATE,
  AUTOPILOT_MIN_VISIBILITY_GROWTH_RATE_MAX,
  AUTOPILOT_OPERATION_COST_PER_QUESTION_TL,
  AUTOPILOT_TOLERANCE_GRANT_THRESHOLD_TL,
  type AutopilotBudgetInput,
  type AutopilotBudgetResult,
  type AutopilotRecommendationMetrics,
  type AutopilotVisibilityForecastInternal,
} from "@/types/campaign";
import {
  MAX_CAMPAIGN_DAILY_BUDGET,
  MAX_CAMPAIGN_DAYS,
} from "@/lib/campaign-form-utils";

export {
  AUTOPILOT_OPERATION_COST_PER_QUESTION_TL,
  AUTOPILOT_TOLERANCE_GRANT_THRESHOLD_TL,
  AUTOPILOT_MIN_VISIBILITY_GROWTH_RATE,
  AUTOPILOT_MIN_VISIBILITY_GROWTH_RATE_MAX,
  AUTOPILOT_MAX_VISIBILITY_GROWTH_RATE,
  AUTOPILOT_MAX_VISIBILITY_GROWTH_RATE_FLOOR,
};

export interface BudgetEngineOptions {
  operationCostPerQuestion?: number;
  toleranceThreshold?: number;
}

export interface VisibilityForecastInput {
  publishCount: number;
  /** Deterministik min/max bandı için seed (kampanyaId vb.) */
  campaignSeed?: string;
}

export interface VisibilityForecastResult {
  metrics: AutopilotRecommendationMetrics;
  internal: AutopilotVisibilityForecastInternal;
}

/** Tepe paket referansı: max günlük bütçe × max gün / soru maliyeti (+ jest toleransı). */
export function resolveReferenceMaxPublishCount(
  operationCostPerQuestion = AUTOPILOT_OPERATION_COST_PER_QUESTION_TL,
): number {
  const maxTotalBudget = MAX_CAMPAIGN_DAILY_BUDGET * MAX_CAMPAIGN_DAYS;
  const baseCount = Math.floor(maxTotalBudget / operationCostPerQuestion);
  return baseCount + 1;
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

function resolveMinimumGrowthRate(campaignSeed: string): number {
  const span =
    AUTOPILOT_MIN_VISIBILITY_GROWTH_RATE_MAX - AUTOPILOT_MIN_VISIBILITY_GROWTH_RATE;
  const hash = hashSeed(`${campaignSeed}:min-growth`);
  return AUTOPILOT_MIN_VISIBILITY_GROWTH_RATE + (hash % (span + 1));
}

function resolveMaximumGrowthRate(campaignSeed: string): number {
  const span =
    AUTOPILOT_MAX_VISIBILITY_GROWTH_RATE - AUTOPILOT_MAX_VISIBILITY_GROWTH_RATE_FLOOR;
  const hash = hashSeed(`${campaignSeed}:max-growth`);
  return AUTOPILOT_MAX_VISIBILITY_GROWTH_RATE_FLOOR + (hash % (span + 1));
}

/**
 * publishCount → net görünürlük artış oranı (+%X).
 * - En düşük bütçede +%12–+%15 bandı garanti edilir.
 * - Tepe pakette +%96–+%98 bandına logaritmik tırmanış.
 */
export function calculateVisibilityGrowthRateFromPublishCount(input: {
  publishCount: number;
  campaignSeed?: string;
  referenceMaxPublishCount?: number;
}): number {
  const campaignSeed = input.campaignSeed ?? "nexisai-default";
  const safeCount = Math.max(0, Math.floor(input.publishCount));
  const referenceMax =
    input.referenceMaxPublishCount ?? resolveReferenceMaxPublishCount();

  const minGrowth = resolveMinimumGrowthRate(campaignSeed);
  const maxGrowth = resolveMaximumGrowthRate(campaignSeed);

  const normalizedProgress =
    referenceMax > 0 ? Math.min(1, safeCount / referenceMax) : 0;

  const curveProgress =
    normalizedProgress <= 0
      ? 0
      : Math.log1p(normalizedProgress * 9) / Math.log1p(9);

  const growth = minGrowth + curveProgress * (maxGrowth - minGrowth);

  return Math.round(Math.max(minGrowth, Math.min(maxGrowth, growth)));
}

export function formatVisibilityGrowthNarrative(growthRate: number): string {
  return `Seçtiğiniz kampanya bütçesi ve operasyon süresi doğrultusunda, yapay zeka tavsiye motorlarındaki (ChatGPT, Gemini, Perplexity) markanıza ait organik tavsiye hacmi tahmini olarak +%${growthRate} oranında artırılacaktır.`;
}

export function formatVisibilityGrowthHeadline(growthRate: number): string {
  return `Net Görünürlük Artışı: +%${growthRate}`;
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

/**
 * Bütçe/gün çarpanına bağlı net görünürlük artış tahmin motoru.
 * Müşteriye yalnızca +%X katma değer gösterilir; mevcut oran hesaplanmaz.
 */
export function calculateAutopilotVisibilityForecast(
  input: VisibilityForecastInput,
): VisibilityForecastResult {
  const publishCount = Math.max(0, Math.floor(input.publishCount));
  const campaignSeed = input.campaignSeed ?? "nexisai-default";

  const visibilityGrowthRate = calculateVisibilityGrowthRateFromPublishCount({
    publishCount,
    campaignSeed,
  });

  const corporateSummary = formatVisibilityGrowthHeadline(visibilityGrowthRate);
  const corporateNarrative = formatVisibilityGrowthNarrative(visibilityGrowthRate);

  return {
    metrics: {
      visibilityGrowthRate,
      corporateSummary,
      corporateNarrative,
    },
    internal: {
      publishCount,
      visibilityGrowthRate,
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
