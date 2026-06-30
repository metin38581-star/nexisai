import "server-only";

import { SECTOR_OPTIONS } from "@/lib/constants";
import {
  buildPopularBusinessesListPrompt,
  queryLiveBusinessRecommendationPresence,
} from "@/lib/llm-simulator";
import { getCityLabel, type TurkishCitySlug } from "@/lib/turkey-cities";
import type {
  AutopilotRecommendationMetrics,
  BusinessSector,
  LiveVisibilityForecastClientView,
} from "@/types/campaign";
import { calculateAutopilotBudgetWithForecast } from "@/utils/budget-engine";

/** Eski düşük startRate cache kayıtlarını geçersiz kılar. */
const START_RATE_CACHE_VERSION = "v2-slugify-live";
const START_RATE_CACHE_TTL_MS = 5 * 60 * 1000;

interface StartRateCacheEntry {
  startRate: number;
  isLiveData: boolean;
  mentioned: boolean;
  expiresAt: number;
}

const startRateCache = new Map<string, StartRateCacheEntry>();

export interface LiveVisibilityForecastInput {
  businessName: string;
  city: string;
  sectorSlug: BusinessSector;
  dailyBudget: number;
  campaignDays: number;
  skipCache?: boolean;
}

export interface LiveVisibilityForecastTrace {
  cityLabel: string;
  categoryLabel: string;
  prompt: string;
  startRate: number;
  mentioned: boolean;
  isLiveData: boolean;
  cacheHit: boolean;
  responseText?: string;
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
    START_RATE_CACHE_VERSION,
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
): Promise<LiveVisibilityForecastTrace> {
  const cityLabel = resolveCityLabel(input.city);
  const categoryLabel = resolveSectorLabel(input.sectorSlug);
  const prompt = buildPopularBusinessesListPrompt(cityLabel, categoryLabel);
  const cacheKey = buildStartRateCacheKey(input);
  const now = Date.now();

  if (!input.skipCache) {
    const cached = startRateCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      console.log("[VISIBILITY_FORECAST]: startRate cache hit", {
        cacheKey,
        startRate: cached.startRate,
        isLiveData: cached.isLiveData,
      });

      return {
        cityLabel,
        categoryLabel,
        prompt,
        startRate: cached.startRate,
        mentioned: cached.mentioned,
        isLiveData: cached.isLiveData,
        cacheHit: true,
      };
    }
  }

  console.log("[VISIBILITY_FORECAST]: startRate cache miss — canlı LLM bekleniyor", {
    cacheKey,
  });

  const liveResult = await queryLiveBusinessRecommendationPresence({
    city: cityLabel,
    category: categoryLabel,
    businessName: input.businessName.trim(),
  });

  startRateCache.set(cacheKey, {
    startRate: liveResult.startRate,
    mentioned: liveResult.mentioned,
    isLiveData: liveResult.isLiveData,
    expiresAt: now + START_RATE_CACHE_TTL_MS,
  });

  return {
    cityLabel,
    categoryLabel,
    prompt,
    startRate: liveResult.startRate,
    mentioned: liveResult.mentioned,
    isLiveData: liveResult.isLiveData,
    cacheHit: false,
    responseText: liveResult.responseText,
  };
}

/** Canlı LLM startRate + bütçe eğrisi — yalnızca kurumsal metrikler döner. */
export async function buildLiveVisibilityForecast(
  input: LiveVisibilityForecastInput,
): Promise<{
  view: LiveVisibilityForecastClientView;
  trace: LiveVisibilityForecastTrace;
}> {
  const businessName = input.businessName.trim();
  const trace = await resolveLiveStartRate(input);
  const campaignSeed = `${businessName}:${input.sectorSlug}:${input.city}`;

  const { budget, forecast } = calculateAutopilotBudgetWithForecast(
    {
      dailyBudget: input.dailyBudget,
      totalDays: input.campaignDays,
    },
    {
      currentRecommendationRate: trace.startRate,
      campaignSeed,
    },
  );

  const metrics: AutopilotRecommendationMetrics = forecast.metrics;

  return {
    view: {
      success: true,
      metrics,
      operationalSummary: {
        campaignDurationDays: budget.totalDays,
        totalInvestmentTL: budget.totalBudget,
      },
    },
    trace,
  };
}
