"use client";

import { CheckCircle2, Circle, Lock, MessageCircleQuestion } from "lucide-react";

import type { GeoMicroIntent } from "@/types/geo-intent";

interface IntentQuestionGridProps {
  intents: GeoMicroIntent[];
  selectedIds: Set<string>;
  softCap: number;
  analysisDescription: string;
  previewId: string | null;
  onPreview: (intent: GeoMicroIntent) => void;
  onToggle: (intent: GeoMicroIntent) => void;
}

export default function IntentQuestionGrid({
  intents,
  selectedIds,
  softCap,
  analysisDescription,
  previewId,
  onPreview,
  onToggle,
}: IntentQuestionGridProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
            Canlı Yapay Zeka Pazar Analizi (En Çok Sorulanlar)
          </p>
          <p className="mt-1 text-xs leading-relaxed text-violet-300/90">
            {analysisDescription}
          </p>
        </div>
        <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold text-violet-200">
          Seçim: {selectedIds.size}/{softCap}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {intents.map((intent, index) => {
          const isSelected = selectedIds.has(intent.id);
          const isLocked = !isSelected && selectedIds.size >= softCap;
          const isPreview = previewId === intent.id;

          return (
            <button
              key={intent.id}
              type="button"
              onClick={() => {
                onPreview(intent);
                onToggle(intent);
              }}
              className={`group relative rounded-xl border p-4 text-left transition-all ${
                isPreview
                  ? "border-emerald-400/50 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                  : isSelected
                    ? "border-violet-400/40 bg-violet-500/10"
                    : isLocked
                      ? "border-zinc-800 bg-zinc-950/40 opacity-70"
                      : "border-zinc-800 bg-zinc-950/60 hover:border-violet-500/30 hover:bg-violet-500/5"
              }`}
            >
              <div className="mb-2 flex items-start gap-2">
                {isSelected ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                ) : isLocked ? (
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600 group-hover:text-violet-400" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Arama Hedefi {index + 1}
                  </p>
                  <p className="mt-1 text-sm font-medium leading-snug text-white">
                    {intent.question}
                  </p>
                </div>
                <MessageCircleQuestion className="h-4 w-4 shrink-0 text-zinc-600" />
              </div>
              <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500">
                {intent.simulatedAnswer}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
