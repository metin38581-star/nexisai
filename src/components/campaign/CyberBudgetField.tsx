"use client";

import { useEffect, useState } from "react";

import NeonCyberRange from "@/components/campaign/NeonCyberRange";
import BudgetOperationTierPanel from "@/components/campaign/BudgetOperationTierPanel";
import { resolveBudgetOperationTier } from "@/lib/budget-operation-tiers";
import "@/components/campaign/budget-operation-tier.css";

interface CyberBudgetFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  /** Sürgü bırakıldığında (mouseup/touchend) veya sayı alanı blur olduğunda çağrılır. */
  onChange: (value: number) => void;
  /** Sürüklerken yalnızca UI önizlemesi — API veya üst form commit tetiklenmez. */
  onDraftChange?: (value: number) => void;
  showAgresiflik?: boolean;
  allowUnset?: boolean;
  clampMode?: "immediate" | "blur";
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
  onDraftChange,
  showAgresiflik = false,
  allowUnset = false,
  clampMode = "immediate",
}: CyberBudgetFieldProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const displayBudget = localValue > 0 ? localValue : min;
  const tierNeon = showAgresiflik
    ? resolveBudgetOperationTier(displayBudget).neonTheme
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

  const applyLocalPreview = (raw: number) => {
    if (allowUnset && raw <= 0) {
      setLocalValue(0);
      onDraftChange?.(0);
      return;
    }

    const next =
      clampMode === "blur" ? Math.min(max, raw) : snapToStep(raw);

    setLocalValue(next);
    onDraftChange?.(next);
  };

  const commitToParent = (raw: number) => {
    if (allowUnset && raw <= 0) {
      setLocalValue(0);
      onDraftChange?.(0);
      onChange(0);
      return;
    }

    let next = raw;
    if (!Number.isFinite(next) || next < min) {
      next = min;
    }
    if (next > max) {
      next = max;
    }
    if (clampMode !== "blur") {
      next = snapToStep(next);
    } else {
      next = Math.min(max, next);
    }

    setLocalValue(next);
    onDraftChange?.(next);
    onChange(next);
  };

  const handleNumberInputChange = (raw: string) => {
    if (allowUnset && raw === "") {
      applyLocalPreview(0);
      return;
    }
    applyLocalPreview(Number(raw));
  };

  const handleBlur = () => {
    if (allowUnset && localValue === 0) {
      commitToParent(0);
      return;
    }
    commitToParent(localValue);
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
            onChange={(e) => handleNumberInputChange(e.target.value)}
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
        onLiveChange={applyLocalPreview}
        onCommit={commitToParent}
      />

      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
        <span>{formatAmount(min)}</span>
        <span>{formatAmount(max)}</span>
      </div>

      {showAgresiflik ? (
        <BudgetOperationTierPanel budget={displayBudget} />
      ) : null}
    </div>
  );
}
