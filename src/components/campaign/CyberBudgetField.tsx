"use client";

import { resolveAgresiflikProfile } from "@/lib/agresiflik";
import NeonCyberRange from "@/components/campaign/NeonCyberRange";

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
}: CyberBudgetFieldProps) {
  const profile =
    showAgresiflik && value > 0 ? resolveAgresiflikProfile(value) : null;

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

  const handleChange = (next: number) => {
    if (allowUnset && next <= 0) {
      onChange(0);
      return;
    }
    if (clampMode === "blur") {
      onChange(Math.min(max, next));
      return;
    }
    onChange(snapToStep(next));
  };

  const handleBlur = () => {
    if (allowUnset && value === 0) {
      return;
    }

    let next = value;
    if (!Number.isFinite(next) || next < min) {
      next = min;
    }
    if (next > max) {
      next = max;
    }
    next = snapToStep(next);

    if (next !== value) {
      onChange(next);
    }
  };

  return (
    <div className="rounded-xl border border-violet-500/15 bg-zinc-950/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-zinc-300">{label}</label>
        <div className="flex items-center rounded-lg border border-cyan-500/20 bg-zinc-900/80 px-3 py-1.5">
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
            value={allowUnset && value === 0 ? "" : value}
            placeholder={allowUnset ? "Bütçe girin" : undefined}
            onChange={(e) => {
              const raw = e.target.value;
              if (allowUnset && raw === "") {
                onChange(0);
                return;
              }
              handleChange(Number(raw));
            }}
            onBlur={handleBlur}
            className="w-24 bg-transparent text-right text-sm font-semibold text-white outline-none placeholder:text-zinc-600"
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
        value={value > 0 ? value : min}
        onChange={(next) => onChange(snapToStep(next))}
      />

      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
        <span>{formatAmount(min)}</span>
        <span>{formatAmount(max)}</span>
      </div>

      {profile && (
        <div className="mt-3 rounded-lg border border-violet-500/10 bg-violet-500/5 px-3 py-2">
          <p className="text-xs font-semibold text-violet-300">
            Agresiflik:{" "}
            <span className="text-white">{profile.seviye}</span>
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
            {profile.aciklama}
          </p>
          <p className="mt-1 text-[11px] text-cyan-400/80">
            Radar sıklığı: {profile.radarSikligi}
          </p>
        </div>
      )}
    </div>
  );
}
