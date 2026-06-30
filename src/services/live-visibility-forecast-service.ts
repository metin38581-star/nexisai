import "server-only";

import { SECTOR_OPTIONS } from "@/lib/constants";
import { queryLiveBusinessRecommendationPresence } from "@/lib/llm-simulator";
import { getCityLabel, type TurkishCitySlug } from "@/lib/turkey-cities";
import type {
  AutopilotRecommendationMetrics,
  BusinessSector,
  LiveVisibilityForecastClientView,
} from "@/types/campaign";
import { calculateAutopilotBudgetWithForecast } from "@/utils/budget-engine";

const START_RATE_CACHE_TTL_MS = 15 * 60 * 1000;

interface StartRateCacheEntry {
  startRate: number;
  expiresAt: number;
}

const startRateCache = new Map<string, StartRateCacheEntry>();

export interface LiveVisibilityForecastInput {
  businessName: string;
  city: string;
  sectorSlug: BusinessSector;
  dailyBudget: number;
  campaignDays: number;
}

function resolveSectorLabel(sectorSlug: BusinessSector): string {
  return (
    SECTOR_OPTIONS.find((option) => option.value === sectorSlug)?.label ??
    sectorSlug
  );
}

function resolveCityLabel(city: string): string {
  return getCityLabel(city as TurkishCitySlug);
}

function buildStartRateCacheKey(input: LiveVisibilityForecastInput): string {
  return [
    normalizeCachePart(input.businessName),
    normalizeCachePart(input.city),
    input.sectorSlug,
  ].join(":");
}

function normalizeCachePart(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

async function resolveLiveStartRate(
  input: LiveVisibilityForecastInput,
): Promise<number> {
  const cacheKey = buildStartRateCacheKey(input);
  const cached = startRateCache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.startRate;
  }

  const cityLabel = resolveCityLabel(input.city);
  const categoryLabel = resolveSectorLabel(input.sectorSlug);

  const liveResult = await queryLiveBusinessRecommendationPresence({
    city: cityLabel,
    category: categoryLabel,
    businessName: input.businessName.trim(),
  });

  startRateCache.set(cacheKey, {
    startRate: liveResult.startRate,
    expiresAt: now + START_RATE_CACHE_TTL_MS,
  });

  return liveResult.startRate;
}

/** Canlı LLM startRate + bütçe eğrisi — yalnızca kurumsal metrikler döner. */
export async function buildLiveVisibilityForecast(
  input: LiveVisibilityForecastInput,
): Promise<LiveVisibilityForecastClientView> {
  const businessName = input.businessName.trim();
  const startRate = await resolveLiveStartRate(input);
  const campaignSeed = `${businessName}:${input.sectorSlug}:${input.city}`;

  const { budget, forecast } = calculateAutopilotBudgetWithForecast(
    {
      dailyBudget: input.dailyBudget,
      totalDays: input.campaignDays,
    },
    {
      currentRecommendationRate: startRate,
      campaignSeed,
    },
  );

  const metrics: AutopilotRecommendationMetrics = forecast.metrics;

  return {
    success: true,
    metrics,
    operationalSummary: {
      campaignDurationDays: budget.totalDays,
      totalInvestmentTL: budget.totalBudget,
    },
  };
}
