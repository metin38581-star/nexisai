"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Radar } from "lucide-react";

import {
  formatBudgetTierAmount,
  resolveBudgetOperationTier,
  resolveTierIntensity,
  resolveTierPowerIcon,
  TIER_NEON_PANEL_CLASS,
  type BudgetOperationTier,
} from "@/lib/budget-operation-tiers";

interface BudgetOperationTierPanelProps {
  budget: number;
  showWhenUnset?: boolean;
}

const fadeVariants = {
  initial: { opacity: 0, y: 10, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(4px)" },
};

function TierContent({
  tier,
  budget,
  intensity,
}: {
  tier: BudgetOperationTier;
  budget: number;
  intensity: number;
}) {
  const PowerIcon = resolveTierPowerIcon();
  const panelClass = TIER_NEON_PANEL_CLASS[tier.neonTheme];
  const glowBoost =
    tier.neonTheme === "quantum"
      ? 0.35 + intensity * 0.65
      : 0.15 + intensity * 0.45;

  return (
    <motion.div
      key={tier.id}
      variants={fadeVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      className={panelClass}
      style={
        tier.neonTheme === "quantum"
          ? ({ "--tier-glow": glowBoost } as React.CSSProperties)
          : ({ "--tier-glow": glowBoost } as React.CSSProperties)
      }
    >
      <div className="bot-tier-scanline" aria-hidden />

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="bot-tier-kicker">{tier.budgetRangeLabel}</p>
          <h3 className="bot-tier-title">{tier.modName}</h3>
          <p className="mt-1 text-lg font-bold tabular-nums text-white">
            {formatBudgetTierAmount(budget)}
            <span className="ml-2 text-xs font-medium text-zinc-500">
              / gün
            </span>
          </p>
        </div>
        <div className="bot-tier-badge">
          <PowerIcon className="h-3.5 w-3.5" />
          {tier.tierLabel}
        </div>
      </div>

      <motion.p
        key={`${tier.id}-promo`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.08, duration: 0.35 }}
        className="bot-tier-promo"
      >
        {tier.promoText}
      </motion.p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="bot-tier-stat">
          <p className="bot-tier-stat-label">Agresiflik</p>
          <p className="bot-tier-stat-value">{tier.agresiflik}</p>
          <p className="bot-tier-stat-hint">{tier.agresiflikDetail}</p>
        </div>
        <div className="bot-tier-stat">
          <p className="bot-tier-stat-label flex items-center gap-1">
            <Radar className="h-3 w-3" />
            Radar Sıklığı
          </p>
          <p className="bot-tier-stat-value">{tier.radarSikligi}</p>
          <p className="bot-tier-stat-hint">
            {tier.radarSikligiDakika <= 1
              ? "Real-time stream aktif"
              : "Canlı tarama döngüsü"}
          </p>
        </div>
        <div className="bot-tier-stat">
          <p className="bot-tier-stat-label">GEO Yemleme</p>
          <p className="bot-tier-stat-value">Günde {tier.makaleSayisi}+</p>
          <p className="bot-tier-stat-hint">Otonom içerik hacmi</p>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Aktif Yapay Zeka Motorları
        </p>
        <div className="flex flex-wrap gap-2">
          {tier.engines.map((engine, index) => {
            const Icon = engine.icon;
            return (
              <motion.div
                key={engine.id}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: 0.06 * index,
                  duration: 0.32,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="bot-tier-engine"
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{engine.name}</span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {tier.neonTheme === "quantum" ? (
        <motion.div
          className="bot-tier-quantum-pulse"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        />
      ) : null}
    </motion.div>
  );
}

export default function BudgetOperationTierPanel({
  budget,
  showWhenUnset = false,
}: BudgetOperationTierPanelProps) {
  const tier = useMemo(
    () => resolveBudgetOperationTier(budget),
    [budget],
  );
  const intensity = useMemo(
    () => resolveTierIntensity(budget, tier),
    [budget, tier],
  );

  if (!showWhenUnset && budget <= 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <AnimatePresence mode="wait">
        <TierContent
          key={tier.id}
          tier={tier}
          budget={budget}
          intensity={intensity}
        />
      </AnimatePresence>
    </div>
  );
}
