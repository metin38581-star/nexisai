"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

import { calculateAutopilotBudgetWithForecast } from "@/utils/budget-engine";
import "@/components/campaign/autopilot-visibility-hero.css";

interface AutopilotVisibilityForecastPanelProps {
  dailyBudget: number;
  campaignDays: number;
}

const COUNTER_DURATION_MS = 500;

function useAnimatedGrowthRate(
  target: number,
  durationMs = COUNTER_DURATION_MS,
): number {
  const [displayValue, setDisplayValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    const to = target;

    if (from === to) {
      fromRef.current = to;
      setDisplayValue(to);
      return;
    }

    const start = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      const value = Math.round(from + (to - from) * eased);
      setDisplayValue(value);

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

export default function AutopilotVisibilityForecastPanel({
  dailyBudget,
  campaignDays,
}: AutopilotVisibilityForecastPanelProps) {
  const metrics = useMemo(() => {
    return calculateAutopilotBudgetWithForecast(
      { dailyBudget, totalDays: campaignDays },
      { campaignSeed: "nexisai-preview" },
    ).forecast.metrics;
  }, [campaignDays, dailyBudget]);

  const animatedGrowthRate = useAnimatedGrowthRate(metrics.visibilityGrowthRate);

  return (
    <article
      className="visibility-hero-card"
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

        <div
          className="visibility-hero-growth"
          aria-label={`Tahmini net görünürlük artışı: yüzde ${metrics.visibilityGrowthRate}`}
        >
          <p className="visibility-hero-growth__label">Net Görünürlük Artışı</p>
          <p className="visibility-hero-growth__sublabel">
            Tahmini Önerilme Dopingi
          </p>
          <span className="visibility-hero-growth__value" aria-live="polite">
            +{animatedGrowthRate}%
          </span>
        </div>

        <p className="visibility-hero-card__narrative">
          {metrics.corporateNarrative}
        </p>

        <p className="visibility-hero-card__footnote">
          {campaignDays} günlük otopilot optimizasyon planı — soru ve içerik
          dağıtımı arka planda otomatik yürütülür; markanız yapay zeka tavsiye
          motorlarında öncelikli referans konumuna taşınır.
        </p>
      </div>
    </article>
  );
}
