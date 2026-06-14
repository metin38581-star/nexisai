"use client";

import { useMemo, useState } from "react";
import { resolveCampaignBudgetParams } from "@/lib/campaign-budget";
import AnimatedCounter from "./AnimatedCounter";

function resolveNetworkTier(gunlukButce: number): {
  label: string;
  color: string;
  glow: string;
} {
  if (gunlukButce > 100) {
    return {
      label: "Kritik Domination",
      color: "text-red-300",
      glow: "border-red-500/40 bg-red-500/10 shadow-[0_0_24px_rgba(239,68,68,0.12)]",
    };
  }
  if (gunlukButce > 50) {
    return {
      label: "Yüksek",
      color: "text-violet-300",
      glow: "border-violet-500/40 bg-violet-500/10 shadow-[0_0_24px_rgba(139,92,246,0.12)]",
    };
  }
  return {
    label: "Standart",
    color: "text-emerald-300",
    glow: "border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_20px_rgba(52,211,153,0.08)]",
  };
}

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  onChange: (value: number) => void;
}

function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  prefix,
  suffix,
  onChange,
}: SliderFieldProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-zinc-300">{label}</label>
        <div className="flex items-center rounded-lg border border-violet-500/20 bg-slate-900/80 px-3 py-1.5">
          {prefix && (
            <span className="mr-1 text-sm font-semibold text-violet-400">
              {prefix}
            </span>
          )}
          <span className="text-sm font-semibold text-white">{value}</span>
          {suffix && (
            <span className="ml-1 text-xs text-zinc-500">{suffix}</span>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="cyber-range w-full"
      />
      <div className="mt-2 flex justify-between text-[11px] text-zinc-600">
        <span>
          {prefix}
          {min}
          {suffix ? ` ${suffix}` : ""}
        </span>
        <span>
          {prefix}
          {max}
          {suffix ? ` ${suffix}` : ""}
        </span>
      </div>
    </div>
  );
}

export default function RoiBudgetCalculator() {
  const [gunlukButce, setGunlukButce] = useState(50);
  const [gunSayisi, setGunSayisi] = useState(14);

  const budgetParams = useMemo(
    () => resolveCampaignBudgetParams(gunlukButce),
    [gunlukButce],
  );

  const toplamIcerik = budgetParams.makaleSayisi * gunSayisi;
  const tahminiTarama = toplamIcerik * 350;
  const networkTier = resolveNetworkTier(gunlukButce);
  const toplamButce = gunlukButce * gunSayisi;

  return (
    <section className="mt-28">
      <div className="mb-10 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-400">
          Bütçe Simülatörü
        </span>
        <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
          Dinamik ROI ve Güç Hesaplayıcı
        </h2>
        <p className="mt-3 text-sm text-zinc-500">
          Günlük bütçe ve operasyon süresini ayarlayın; dağıtım gücünü anında
          görün.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-5">
          <SliderField
            label="Günlük Bütçe"
            value={gunlukButce}
            min={10}
            max={150}
            step={5}
            prefix="$"
            onChange={setGunlukButce}
          />
          <SliderField
            label="Operasyon Süresi"
            value={gunSayisi}
            min={3}
            max={30}
            step={1}
            suffix="gün"
            onChange={setGunSayisi}
          />

          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 px-4 py-3 text-center text-xs text-zinc-500">
            Toplam kampanya bütçesi:{" "}
            <span className="font-semibold text-zinc-300">
              ${toplamButce.toLocaleString("tr-TR")}
            </span>
            {" · "}
            Günlük {budgetParams.makaleSayisi} rehber içerik
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-1">
          <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 backdrop-blur-md transition-all duration-300 hover:border-purple-500/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Dağıtılacak Toplam Rehber İçerik
            </p>
            <p className="mt-2 text-3xl font-bold text-white">
              <AnimatedCounter value={toplamIcerik} />
              <span className="ml-1 text-base font-normal text-zinc-500">
                adet
              </span>
            </p>
            <p className="mt-2 text-xs text-zinc-600">
              {budgetParams.makaleSayisi} içerik/gün × {gunSayisi} gün
            </p>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 backdrop-blur-md transition-all duration-300 hover:border-emerald-500/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Tahmini Semantik Bot Taraması
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-300">
              <AnimatedCounter value={tahminiTarama} />
            </p>
            <p className="mt-2 text-xs text-zinc-600">
              Toplam içerik × 350 tarama indeksi
            </p>
          </article>

          <article
            className={`rounded-2xl border p-5 backdrop-blur-md transition-all duration-500 ${networkTier.glow}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Ağ Erişim Katsayısı
            </p>
            <p className={`mt-2 text-2xl font-bold ${networkTier.color}`}>
              {networkTier.label}
            </p>
            <p className="mt-2 text-xs text-zinc-600">
              Bütçe arttıkça dağıtım ağı genişler ve tarama frekansı yükselir
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
