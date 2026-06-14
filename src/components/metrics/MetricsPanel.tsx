"use client";

import type { CampaignMetrics } from "@/types/campaign";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import MetricCard from "./MetricCard";

interface MetricsPanelProps {
  currentMetrics: CampaignMetrics;
  targetMetrics: CampaignMetrics | null;
  isAnimating: boolean;
}

export default function MetricsPanel({
  currentMetrics,
  targetMetrics,
  isAnimating,
}: MetricsPanelProps) {
  const display = isAnimating && targetMetrics ? targetMetrics : currentMetrics;
  const from = currentMetrics;

  const visibilityRate = useAnimatedNumber(
    from.visibilityRate,
    display.visibilityRate,
    { enabled: isAnimating, duration: 1600 },
  );

  const estimatedTraffic = useAnimatedNumber(
    from.estimatedTraffic,
    display.estimatedTraffic,
    { enabled: isAnimating, duration: 1600 },
  );

  const spentBudget = useAnimatedNumber(
    from.spentBudget,
    display.spentBudget,
    { enabled: isAnimating, duration: 1600 },
  );

  const fromProgress =
    from.totalBudget > 0 ? (from.spentBudget / from.totalBudget) * 100 : 0;
  const toProgress =
    display.totalBudget > 0
      ? (display.spentBudget / display.totalBudget) * 100
      : 0;

  const animatedBudgetProgress = useAnimatedNumber(
    Math.round(fromProgress),
    Math.round(toProgress),
    { enabled: isAnimating, duration: 1600 },
  );

  const formatCurrency = (amount: number) =>
    `${amount.toLocaleString("tr-TR")} ₺`;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <MetricCard
        title="Yapay Zeka Görünürlük Oranı"
        value={`%${visibilityRate}`}
        subtitle="Hedef motorlarda tavsiye sıralaması"
        accent="violet"
        isAnimating={isAnimating}
      />
      <MetricCard
        title="Tahmini Müşteri Trafiği"
        value={estimatedTraffic.toLocaleString("tr-TR")}
        subtitle="Kampanya döneminde beklenen ziyaret"
        accent="blue"
        isAnimating={isAnimating}
      />
      <MetricCard
        title="Harcanan Reklam Bütçesi"
        value={formatCurrency(spentBudget)}
        subtitle={`Toplam: ${formatCurrency(display.totalBudget)}`}
        progress={toProgress}
        animatedProgress={animatedBudgetProgress}
        accent="emerald"
        isAnimating={isAnimating}
      />
    </div>
  );
}
