"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";

import {
  calculateAutopilotBudgetWithForecast,
  formatAutopilotCorporatePanelNarrative,
} from "@/utils/budget-engine";
import { isCoreQuestionSectorSupported } from "@/lib/core-questions";
import type { BusinessSector } from "@/types/campaign";

interface AutopilotVisibilityForecastPanelProps {
  dailyBudget: number;
  campaignDays: number;
  sector: BusinessSector | "";
  city: string;
  businessName: string;
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

  const forecast = useMemo(
    () =>
      calculateAutopilotBudgetWithForecast(
        { dailyBudget, totalDays: campaignDays },
        { campaignSeed: forecastSeed },
      ),
    [campaignDays, dailyBudget, forecastSeed],
  );

  const { baselineRecommendationRate, targetRecommendationRate } =
    forecast.forecast.metrics;

  const narrative = formatAutopilotCorporatePanelNarrative(
    baselineRecommendationRate,
    targetRecommendationRate,
  );

  const sectorReady = isCoreQuestionSectorSupported(sector);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-br from-zinc-950/95 via-violet-950/20 to-cyan-950/10 p-5 shadow-[0_0_40px_rgba(139,92,246,0.08)]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.12),transparent_55%)]"
        aria-hidden
      />

      <div className="relative flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10">
          <Sparkles className="h-5 w-5 text-violet-300" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/90">
            Yapay Zeka Görünürlük Tahmini
          </p>

          {sectorReady ? (
            <>
              <p className="mt-3 text-sm leading-relaxed text-zinc-200">
                {narrative}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-zinc-700/80 bg-zinc-900/70 px-3 py-1 text-[11px] font-medium text-zinc-300">
                  Mevcut önerilme oranı: %{baselineRecommendationRate}
                </span>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                  Hedef önerilme oranı: %{targetRecommendationRate}
                </span>
                <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[11px] font-medium text-cyan-200">
                  {campaignDays} gün otopilot optimizasyon
                </span>
              </div>

              <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">
                Soru ve içerik dağıtımı tamamen otopilot modda yürütülür; markanız
                için en uygun kemik soru seti arka planda seçilir ve yayın
                takvimine alınır.
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Tahmini görünürlük skorunu hesaplamak için sektör seçimini
              tamamlayın. Bütçe ve gün planınız onaylandığında optimizasyon
              motoru otomatik devreye girecektir.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
