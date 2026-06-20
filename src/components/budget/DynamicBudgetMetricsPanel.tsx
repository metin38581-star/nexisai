"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, Radar, Target, Zap } from "lucide-react";

const MIN_BUDGET = 300;
const MAX_BUDGET = 3000;
const BUDGET_STEP = 100;
const DEFAULT_BUDGET = 300;

type RecommendationTone = "warning" | "balanced" | "dominant";

export interface DynamicBudgetMetricsPanelProps {
  initialBudget?: number;
  onBudgetChange?: (budget: number) => void;
  className?: string;
}

export interface BudgetMetricsSnapshot {
  budget: number;
  visibilityDuration: string;
  visibilityUrgent: boolean;
  algorithmStrength: number;
  algorithmLabel: string;
  radarCoverage: number;
  radarDisplay: string;
  systemRecommendation: string;
  recommendationTone: RecommendationTone;
}

function clampBudget(value: number): number {
  const stepped =
    Math.round((value - MIN_BUDGET) / BUDGET_STEP) * BUDGET_STEP + MIN_BUDGET;
  return Math.min(MAX_BUDGET, Math.max(MIN_BUDGET, stepped));
}

export function calcAlgorithmStrength(budget: number): number {
  return Math.min(
    100,
    Math.round(15 + ((budget - MIN_BUDGET) / (MAX_BUDGET - MIN_BUDGET)) * 85),
  );
}

export function calcRadarCoverage(budget: number): number {
  return Math.min(
    100,
    Math.round(20 + ((budget - MIN_BUDGET) / (MAX_BUDGET - MIN_BUDGET)) * 80),
  );
}

function resolveVisibilityDuration(budget: number): {
  text: string;
  urgent: boolean;
} {
  if (budget >= 2000) {
    return { text: "24 Saat", urgent: true };
  }
  if (budget >= 1000) {
    return { text: "72 Saat", urgent: false };
  }
  return { text: "7 Gün (168 Saat)", urgent: false };
}

function resolveAlgorithmLabel(budget: number): string {
  if (budget >= 2000) {
    return "Dominant Sponsor / Sektör Lideri Modu";
  }
  if (budget >= 1000) {
    return "Güçlü Tavsiye (İlk 3 Sıra Hedefi)";
  }
  return "Alternatif / Alt Öneri Seviyesi";
}

function resolveSystemRecommendation(budget: number): {
  text: string;
  tone: RecommendationTone;
} {
  if (budget >= 2000) {
    return {
      tone: "dominant",
      text: "⚡ Anlık Sonuç: Maksimum bütçe gücü devrede! Yapay zeka canlı arama motorlarında (ChatGPT, Perplexity vb.) 24 saat içerisinde görünürlük süreciniz tetiklenir. Hızlı ve dominant bir sonuç için en etkili moddur.",
    };
  }
  if (budget >= 1000) {
    return {
      tone: "balanced",
      text: "⏱️ Sistem Önerisi: Bu bütçe seviyesi, yapay zeka arama motorlarının radarına daha agresif giriş sağlar. Öneri motorlarında listelenmeye başlamanız için 3 ila 4 günlük bir reklam süresi ideal verimliliği sunar.",
    };
  }
  return {
    tone: "warning",
    text: "⚠️ Sistem Önerisi: Yapay zekalarda (LLM) görünürlük sağlamak için bu bütçe ile minimum 1 hafta reklam süresi önerilir. Algoritmanın işletmenizi tarayıp doğrulaması bu bütçe seviyesinde zamana yayılmaktadır.",
  };
}

export function buildBudgetMetricsSnapshot(budget: number): BudgetMetricsSnapshot {
  const normalized = clampBudget(budget);
  const visibility = resolveVisibilityDuration(normalized);
  const algorithmStrength = calcAlgorithmStrength(normalized);
  const radarCoverage = calcRadarCoverage(normalized);
  const recommendation = resolveSystemRecommendation(normalized);

  return {
    budget: normalized,
    visibilityDuration: visibility.text,
    visibilityUrgent: visibility.urgent,
    algorithmStrength,
    algorithmLabel: resolveAlgorithmLabel(normalized),
    radarCoverage,
    radarDisplay:
      normalized >= MAX_BUDGET
        ? "🔥 %100 Tam Kapsama"
        : `%${radarCoverage}`,
    systemRecommendation: recommendation.text,
    recommendationTone: recommendation.tone,
  };
}

interface NeonProgressBarProps {
  value: number;
  gradient: string;
  glow: string;
}

function NeonProgressBar({ value, gradient, glow }: NeonProgressBarProps) {
  return (
    <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-900/90 ring-1 ring-white/5">
      <motion.div
        className={`absolute inset-y-0 left-0 rounded-full ${gradient} ${glow}`}
        initial={false}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20, mass: 0.6 }}
      />
      <motion.div
        className="pointer-events-none absolute inset-y-0 left-0 w-16 rounded-full bg-white/25 blur-md"
        initial={false}
        animate={{ left: `${Math.min(84, Math.max(0, value - 8))}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20, mass: 0.6 }}
      />
    </div>
  );
}

interface MetricTileProps {
  icon: ReactNode;
  title: string;
  value: ReactNode;
  subtitle?: string;
  accent: "emerald" | "blue";
  children?: React.ReactNode;
}

function MetricTile({
  icon,
  title,
  value,
  subtitle,
  accent,
  children,
}: MetricTileProps) {
  const accentRing =
    accent === "emerald"
      ? "border-emerald-500/20 shadow-[0_0_28px_rgba(52,211,153,0.08)]"
      : "border-cyan-500/20 shadow-[0_0_28px_rgba(34,211,238,0.08)]";

  const iconTone =
    accent === "emerald"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-400"
      : "border-cyan-400/30 bg-cyan-500/10 text-cyan-400";

  return (
    <motion.article
      layout
      className={`rounded-2xl border bg-slate-950/70 p-5 backdrop-blur-xl ${accentRing}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${iconTone}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {title}
          </p>
          <div className="mt-2">{value}</div>
          {subtitle ? (
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              {subtitle}
            </p>
          ) : null}
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </div>
    </motion.article>
  );
}

const recommendationStyles: Record<
  RecommendationTone,
  { border: string; bg: string; text: string }
> = {
  warning: {
    border: "border-amber-500/25",
    bg: "bg-amber-500/5",
    text: "text-amber-100/90",
  },
  balanced: {
    border: "border-cyan-500/25",
    bg: "bg-cyan-500/5",
    text: "text-cyan-50/90",
  },
  dominant: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/8",
    text: "text-emerald-50/95",
  },
};

export default function DynamicBudgetMetricsPanel({
  initialBudget = DEFAULT_BUDGET,
  onBudgetChange,
  className = "",
}: DynamicBudgetMetricsPanelProps) {
  const [budget, setBudget] = useState(() => clampBudget(initialBudget));

  const metrics = useMemo(() => buildBudgetMetricsSnapshot(budget), [budget]);

  const handleBudgetChange = (next: number) => {
    const normalized = clampBudget(next);
    setBudget(normalized);
    onBudgetChange?.(normalized);
  };

  const recommendationStyle =
    recommendationStyles[metrics.recommendationTone];

  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-[#070b14] via-[#0b1220] to-[#0a0f18] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-8 ${className}`}
    >
      <div className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-0 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
              <Zap className="h-3.5 w-3.5" />
              NexisAI Dinamik Bütçe
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Bütçe ve Metrik Paneli
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Kampanya bütçenizi ayarlayın; görünürlük süresi, algoritma gücü
              ve LLM radar kapsamı anlık olarak hesaplansın.
            </p>
          </div>

          <motion.div
            key={metrics.budget}
            initial={{ scale: 0.96, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 px-5 py-3 text-right shadow-[0_0_24px_rgba(52,211,153,0.12)]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300/80">
              Seçili Bütçe
            </p>
            <p className="mt-1 text-3xl font-bold text-white">
              {metrics.budget.toLocaleString("tr-TR")}{" "}
              <span className="text-lg font-semibold text-emerald-300">TL</span>
            </p>
          </motion.div>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/50 p-5 backdrop-blur-md">
          <div className="mb-4 flex items-center justify-between gap-3">
            <label
              htmlFor="nexis-budget-slider"
              className="text-sm font-medium text-slate-300"
            >
              Kampanya Bütçesi
            </label>
            <span className="rounded-lg border border-cyan-500/20 bg-slate-900/80 px-3 py-1.5 text-sm font-semibold text-cyan-300">
              {metrics.budget.toLocaleString("tr-TR")} TL
            </span>
          </div>

          <input
            id="nexis-budget-slider"
            type="range"
            min={MIN_BUDGET}
            max={MAX_BUDGET}
            step={BUDGET_STEP}
            value={metrics.budget}
            onChange={(event) => handleBudgetChange(Number(event.target.value))}
            className="cyber-range w-full"
            aria-valuemin={MIN_BUDGET}
            aria-valuemax={MAX_BUDGET}
            aria-valuenow={metrics.budget}
            aria-label="Kampanya bütçesi kaydırıcısı"
          />

          <div className="mt-2 flex justify-between text-[11px] text-slate-500">
            <span>{MIN_BUDGET.toLocaleString("tr-TR")} TL</span>
            <span>{MAX_BUDGET.toLocaleString("tr-TR")} TL</span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <MetricTile
            accent="blue"
            icon={<Clock className="h-5 w-5" />}
            title="Görünürlük Süresi"
            value={
              metrics.visibilityUrgent ? (
                <motion.p
                  className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-lime-300 to-red-400"
                  animate={{ opacity: [0.72, 1, 0.72] }}
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  {metrics.visibilityDuration}
                </motion.p>
              ) : (
                <motion.p
                  key={metrics.visibilityDuration}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl font-bold text-white"
                >
                  {metrics.visibilityDuration}
                </motion.p>
              )
            }
            subtitle="LLM motorlarında aktif görünürlük penceresi"
          />

          <MetricTile
            accent="emerald"
            icon={<Target className="h-5 w-5" />}
            title="Algoritma Öneri Gücü"
            value={
              <motion.p
                key={metrics.algorithmStrength}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-bold text-emerald-300"
              >
                %{metrics.algorithmStrength}
              </motion.p>
            }
            subtitle={metrics.algorithmLabel}
          >
            <NeonProgressBar
              value={metrics.algorithmStrength}
              gradient="bg-gradient-to-r from-emerald-500 via-lime-400 to-emerald-300"
              glow="shadow-[0_0_18px_rgba(52,211,153,0.55)]"
            />
          </MetricTile>

          <MetricTile
            accent="blue"
            icon={<Radar className="h-5 w-5" />}
            title="Yapay Zeka Radarı Kapsama Alanı"
            value={
              <motion.p
                key={metrics.radarDisplay}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-2xl font-bold ${
                  metrics.budget >= MAX_BUDGET
                    ? "text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-300 to-emerald-300"
                    : "text-cyan-300"
                }`}
              >
                {metrics.radarDisplay}
              </motion.p>
            }
            subtitle="LLM Radar Coverage"
          >
            <NeonProgressBar
              value={metrics.radarCoverage}
              gradient="bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-400"
              glow="shadow-[0_0_18px_rgba(34,211,238,0.55)]"
            />
          </MetricTile>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={metrics.systemRecommendation}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className={`mt-6 rounded-2xl border px-5 py-4 ${recommendationStyle.border} ${recommendationStyle.bg}`}
          >
            <p
              className={`text-sm leading-relaxed ${recommendationStyle.text}`}
            >
              {metrics.systemRecommendation}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
