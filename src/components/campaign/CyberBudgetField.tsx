"use client";

import { resolveAgresiflikProfile } from "@/lib/agresiflik";

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
}

export default function CyberBudgetField({
  label,
  value,
  min,
  max,
  step = 1,
  prefix = "$",
  suffix,
  onChange,
  showAgresiflik = false,
  allowUnset = false,
}: CyberBudgetFieldProps) {
  const profile =
    showAgresiflik && value > 0 ? resolveAgresiflikProfile(value) : null;

  const handleChange = (next: number) => {
    if (allowUnset && next <= 0) {
      onChange(0);
      return;
    }
    onChange(Math.min(max, Math.max(min, next)));
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
            className="w-16 bg-transparent text-right text-sm font-semibold text-white outline-none placeholder:text-zinc-600"
          />
          {suffix && <span className="ml-1 text-xs text-zinc-500">{suffix}</span>}
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value > 0 ? value : min}
        onChange={(e) => handleChange(Number(e.target.value))}
        className="cyber-range w-full"
      />

      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
        <span>
          {prefix}
          {min}
        </span>
        <span>
          {prefix}
          {max}
        </span>
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
