"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import {
  calculateAutopilotBudgetWithForecast,
  formatAutopilotCorporatePanelNarrative,
} from "@/utils/budget-engine";
import { isCoreQuestionSectorSupported } from "@/lib/core-questions";
import type {
  AutopilotRecommendationMetrics,
  BusinessSector,
  LiveVisibilityForecastClientView,
} from "@/types/campaign";
import "@/components/campaign/autopilot-visibility-hero.css";

interface AutopilotVisibilityForecastPanelProps {
  dailyBudget: number;
  campaignDays: number;
  sector: BusinessSector | "";
  city: string;
  businessName: string;
}

const COUNTER_DURATION_MS = 500;
const HERO_RATE_CEILING = 98;
const FORECAST_DEBOUNCE_MS = 650;

function roundDisplayRate(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function useAnimatedRate(target: number, durationMs = COUNTER_DURATION_MS): number {
  const [displayValue, setDisplayValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    const to = target;

    if (Math.abs(from - to) < 0.05) {
      fromRef.current = to;
      setDisplayValue(to);
      return;
    }

    const start = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      setDisplayValue(from + (to - from) * eased);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
        setDisplayValue(to);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target, durationMs]);

  return displayValue;
}

function buildFallbackMetrics(input: {
  dailyBudget: number;
  campaignDays: number;
  forecastSeed: string;
}): AutopilotRecommendationMetrics {
  return calculateAutopilotBudgetWithForecast(
    { dailyBudget: input.dailyBudget, totalDays: input.campaignDays },
    { campaignSeed: input.forecastSeed },
  ).forecast.metrics;
}

export default function AutopilotVisibilityForecastPanel({
  dailyBudget,
  campaignDays,
  sector,
  city,
  businessName,
}: AutopilotVisibilityForecastPanelProps) {
  const forecastSeed = useMemo(() => {
    const brand = businessName.trim() || "nexisai";
    const location = city.trim() || "turkiye";
    const sectorKey = sector || "general";
    return `${brand}:${sectorKey}:${location}`;
  }, [businessName, city, sector]);

  const sectorReady =
    isCoreQuestionSectorSupported(sector) &&
    businessName.trim().length > 0 &&
    city.trim().length > 0;

  const fallbackMetrics = useMemo(
    () =>
      buildFallbackMetrics({
        dailyBudget,
        campaignDays,
        forecastSeed,
      }),
    [campaignDays, dailyBudget, forecastSeed],
  );

  const [metrics, setMetrics] =
    useState<AutopilotRecommendationMetrics>(fallbackMetrics);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const requestVersionRef = useRef(0);

  useEffect(() => {
    if (!sectorReady) {
      setMetrics(fallbackMetrics);
      return;
    }

    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setIsRefreshing(true);

      try {
        const response = await fetch("/api/campaign/visibility-forecast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            businessName: businessName.trim(),
            city: city.trim(),
            sector,
            dailyBudget,
            campaignDays,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as LiveVisibilityForecastClientView;
        if (
          requestVersionRef.current !== requestVersion ||
          !payload.success ||
          !payload.metrics
        ) {
          return;
        }

        setMetrics(payload.metrics);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      } finally {
        if (requestVersionRef.current === requestVersion) {
          setIsRefreshing(false);
        }
      }
    }, FORECAST_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    businessName,
    campaignDays,
    city,
    dailyBudget,
    fallbackMetrics,
    sector,
    sectorReady,
  ]);

  const { baselineRecommendationRate, targetRecommendationRate } = metrics;

  const animatedTargetRate = useAnimatedRate(targetRecommendationRate);

  const climbBeamWidth = useMemo(() => {
    const span = HERO_RATE_CEILING - baselineRecommendationRate;
    if (span <= 0) {
      return 100;
    }

    const progress =
      (animatedTargetRate - baselineRecommendationRate) / span;

    return Math.min(100, Math.max(12, progress * 100));
  }, [animatedTargetRate, baselineRecommendationRate]);

  const narrative = formatAutopilotCorporatePanelNarrative(
    baselineRecommendationRate,
    targetRecommendationRate,
  );

  return (
    <article
      className={`visibility-hero-card${isRefreshing ? " visibility-hero-card--refreshing" : ""}`}
      aria-label="Yapay zeka görünürlük tahmini"
    >
      <div className="visibility-hero-card__glow" aria-hidden />

      <div className="visibility-hero-card__inner">
        <header className="visibility-hero-card__header">
          <div className="visibility-hero-card__icon" aria-hidden>
            <Sparkles />
          </div>
          <h3 className="visibility-hero-card__title">
            Yapay Zeka Görünürlük Tahmini
          </h3>
        </header>

        {sectorReady ? (
          <>
            <div
              className="visibility-hero-climb"
              aria-label={`Önerilme oranı yükselişi: yüzde ${roundDisplayRate(baselineRecommendationRate)}'ten yüzde ${roundDisplayRate(targetRecommendationRate)}'ye`}
            >
              <div className="visibility-hero-climb__rate visibility-hero-climb__rate--baseline">
                %{roundDisplayRate(baselineRecommendationRate)}
              </div>

              <div className="visibility-hero-climb__track" aria-hidden>
                <div
                  className="visibility-hero-climb__beam"
                  style={{ width: `${climbBeamWidth}%` }}
                />
                <div className="visibility-hero-climb__arrow">
                  <ArrowRight strokeWidth={2.5} />
                </div>
              </div>

              <div
                className="visibility-hero-climb__rate visibility-hero-climb__rate--target"
                aria-live="polite"
              >
                %{roundDisplayRate(animatedTargetRate)}
              </div>
            </div>

            <p className="visibility-hero-card__narrative">{narrative}</p>

            <p className="visibility-hero-card__footnote">
              {campaignDays} günlük otopilot optimizasyon planı — soru ve içerik
              dağıtımı arka planda otomatik yürütülür; markanız yapay zeka
              tavsiye motorlarında öncelikli referans konumuna taşınır.
            </p>
          </>
        ) : (
          <>
            <div className="visibility-hero-card__placeholder-climb" aria-hidden>
              <span className="visibility-hero-card__placeholder-rate">%—</span>
              <ArrowRight className="h-8 w-8 text-violet-400/40" />
              <span className="visibility-hero-card__placeholder-rate">%—</span>
            </div>
            <p className="visibility-hero-card__narrative">
              Tahmini görünürlük skorunu hesaplamak için işletme adı, sektör ve
              şehir bilgilerini tamamlayın. Optimizasyon motoru otomatik devreye
              girecektir.
            </p>
          </>
        )}
      </div>
    </article>
  );
}
