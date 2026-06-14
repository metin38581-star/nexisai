"use client";

import { useDistribution } from "@/context/DistributionContext";

export default function DistributionStatusPanel() {
  const { status, progress, statusLabel, currentStep, totalSteps } =
    useDistribution();

  const isLive = status === "running";
  const showPanel = status !== "idle";

  if (!showPanel) {
    return null;
  }

  return (
    <div className="glass-card border border-cyan-500/20 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-400">
            Real-time
          </p>
          <h3 className="mt-1 text-sm font-semibold text-white">
            Yapay Zeka Yemleme Durumu
          </h3>
          <p className="mt-1 text-xs text-zinc-500">{statusLabel}</p>
        </div>
        {isLive && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Canlı
          </span>
        )}
      </div>

      <div className="relative h-2.5 overflow-hidden rounded-full bg-zinc-800/80">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-500 via-violet-500 to-emerald-400 transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)] animate-pulse" />
      </div>

      <div className="mt-3 flex items-center justify-between font-mono text-[11px]">
        <span className="text-zinc-500">
          {totalSteps > 0
            ? `Adım ${currentStep}/${totalSteps}`
            : "Hazırlanıyor"}
        </span>
        <span className="text-cyan-300">%{progress}</span>
      </div>
    </div>
  );
}
