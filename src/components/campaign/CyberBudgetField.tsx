"use client";

import { useEffect, useState } from "react";

import NeonCyberRange from "@/components/campaign/NeonCyberRange";
import BudgetOperationTierPanel from "@/components/campaign/BudgetOperationTierPanel";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { resolveBudgetOperationTier } from "@/lib/budget-operation-tiers";
import "@/components/campaign/budget-operation-tier.css";

const SLIDER_COMMIT_DEBOUNCE_MS = 500;

interface CyberBudgetFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  onChange: (value: number) => void;
  showAgresiflik?: boolean;
  /** true iken 0 değeri boş input olarak gösterilir (tarama öncesi bütçe zorunluluğu). */
  allowUnset?: boolean;
  /** immediate: her değişimde min/max kilitle | blur: min yalnızca odak kaybında uygulanır */
  clampMode?: "immediate" | "blur";
  /** Tier paneli için gecikmeli bütçe (sürgü kaydırırken debounce). */
  tierBudget?: number;
}

export default function CyberBudgetField({
  label,
  value,
  min,
  max,
  step = 1,
  prefix = "",
  suffix,
  onChange,
  showAgresiflik = false,
  allowUnset = false,
  clampMode = "immediate",
  tierBudget,
}: CyberBudgetFieldProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const displayBudget = localValue > 0 ? localValue : min;
  const tierSource = tierBudget ?? displayBudget;
  const tierNeon = showAgresiflik
    ? resolveBudgetOperationTier(tierSource).neonTheme
    : "cyan";

  const clampValue = (next: number): number =>
    Math.min(max, Math.max(min, next));

  const snapToStep = (next: number): number => {
    if (step <= 1) {
      return clampValue(next);
    }
    const snapped = Math.round(next / step) * step;
    return clampValue(snapped);
  };

  const formatAmount = (amount: number): string => {
    const formatted = amount.toLocaleString("tr-TR");
    if (suffix) {
      return `${formatted} ${suffix}`;
    }
    if (prefix) {
      return `${prefix}${formatted}`;
    }
    return formatted;
  };

  const debouncedCommit = useDebouncedCallback((next: number) => {
    onChange(next);
  }, SLIDER_COMMIT_DEBOUNCE_MS);

  const commitValue = (raw: number, options?: { immediate?: boolean }) => {
    if (allowUnset && raw <= 0) {
      setLocalValue(0);
      debouncedCommit.cancel();
      onChange(0);
      return;
    }

    let next = raw;
    if (clampMode !== "blur") {
      next = snapToStep(raw);
    } else {
      next = Math.min(max, raw);
    }

    setLocalValue(next);

    if (options?.immediate) {
      debouncedCommit.cancel();
      onChange(next);
      return;
    }

    debouncedCommit(next);
  };

  const handleBlur = () => {
    if (allowUnset && localValue === 0) {
      return;
    }

    let next = localValue;
    if (!Number.isFinite(next) || next < min) {
      next = min;
    }
    if (next > max) {
      next = max;
    }
    next = snapToStep(next);
    commitValue(next, { immediate: true });
  };

  return (
    <div className="rounded-xl border border-violet-500/15 bg-zinc-950/50 p-3 sm:p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <label className="text-sm font-medium text-zinc-300">{label}</label>
        <div className="flex w-full items-center rounded-lg border border-cyan-500/20 bg-zinc-900/80 px-3 py-2 sm:w-auto sm:py-1.5">
          {prefix && (
            <span className="mr-1 text-sm font-semibold text-cyan-400">
              {prefix}
            </span>
          )}
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={allowUnset && localValue === 0 ? "" : localValue}
            placeholder={allowUnset ? "Bütçe girin" : undefined}
            onChange={(e) => {
              const raw = e.target.value;
              if (allowUnset && raw === "") {
                commitValue(0, { immediate: true });
                return;
              }
              commitValue(Number(raw));
            }}
            onBlur={handleBlur}
            className="w-full min-w-0 bg-transparent text-right text-sm font-semibold text-white outline-none placeholder:text-zinc-600 sm:w-24"
          />
          {suffix ? (
            <span className="ml-1 text-xs font-medium text-cyan-400/90">
              {suffix}
            </span>
          ) : null}
        </div>
      </div>

      <NeonCyberRange
        min={min}
        max={max}
        step={step}
        value={localValue > 0 ? localValue : min}
        neonTheme={tierNeon}
        onLiveChange={(next) => {
          const snapped = snapToStep(next);
          setLocalValue(snapped);
          debouncedCommit(snapped);
        }}
        onCommit={(next) => {
          commitValue(next, { immediate: true });
        }}
      />

      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
        <span>{formatAmount(min)}</span>
        <span>{formatAmount(max)}</span>
      </div>

      {showAgresiflik ? (
        <BudgetOperationTierPanel budget={tierSource} />
      ) : null}
    </div>
  );
}
