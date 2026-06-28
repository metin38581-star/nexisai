"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Eye } from "lucide-react";

import LiveLlmVisibilitySimulator from "@/components/campaign/LiveLlmVisibilitySimulator";
import type { CampaignGrowthLoopResponse } from "@/types/growth-loop";
import type { BusinessSector } from "@/types/campaign";
import { buildAuthFetchInit } from "@/lib/auth-headers";
import { buildCoreQuestionPairs } from "@/lib/core-questions";
import {
  LLM_ENGINES,
  resolveLlmEngine,
  type LlmEngine,
} from "@/lib/llm-visibility-ui";

interface TargetedQuestionsGrowthPanelProps {
  campaignId: string | null;
  brandName: string;
  selectedCity?: string | null;
  sectorSlug?: BusinessSector | "";
  sectorLabel?: string;
  selectedQuestionIds?: string[];
  accessToken: string | null;
}

interface QuestionRow {
  id: string;
  question: string;
  initialScore: number;
  currentScore: number;
  llmEngine: LlmEngine;
}

export default function TargetedQuestionsGrowthPanel({
  campaignId,
  brandName,
  selectedCity,
  sectorSlug = "",
  sectorLabel = "",
  selectedQuestionIds = [],
  accessToken,
}: TargetedQuestionsGrowthPanelProps) {
  const [growthLoop, setGrowthLoop] =
    useState<CampaignGrowthLoopResponse | null>(null);
  const [activeSimulation, setActiveSimulation] = useState<QuestionRow | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchGrowthLoop = useCallback(async () => {
    if (!campaignId || !accessToken) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/campaign/${campaignId}/growth-loop`,
        buildAuthFetchInit(accessToken),
      );
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as CampaignGrowthLoopResponse & {
        success?: boolean;
      };
      if (data.questionScores) {
        setGrowthLoop(data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, accessToken]);

  useEffect(() => {
    void fetchGrowthLoop();
    const interval = window.setInterval(() => {
      void fetchGrowthLoop();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [fetchGrowthLoop]);

  const questionRows = useMemo((): QuestionRow[] => {
    const scoreEntries = growthLoop?.questionScores ?? [];

    const selectedPairs =
      selectedQuestionIds.length > 0 && sectorSlug
        ? buildCoreQuestionPairs(
            selectedQuestionIds,
            sectorSlug,
            selectedCity ?? "",
            brandName,
            sectorLabel,
          )
        : [];

    const sourceQuestions =
      selectedPairs.length > 0
        ? selectedPairs.map((pair, index) => ({
            id: selectedQuestionIds[index] ?? `question-${index}`,
            question: pair.question,
          }))
        : scoreEntries.map((entry, index) => ({
            id: `growth-${index}`,
            question: entry.question,
          }));

    return sourceQuestions.map((entry, index) => {
      const scoreEntry =
        scoreEntries.find(
          (score) =>
            score.question.trim().toLowerCase() ===
            entry.question.trim().toLowerCase(),
        ) ?? scoreEntries[index];

      return {
        id: entry.id,
        question: entry.question,
        initialScore: scoreEntry?.initialScore ?? 0,
        currentScore: scoreEntry?.currentScore ?? 0,
        llmEngine: resolveLlmEngine(index),
      };
    });
  }, [
    brandName,
    growthLoop?.questionScores,
    sectorLabel,
    sectorSlug,
    selectedCity,
    selectedQuestionIds,
  ]);

  const openSimulation = (row: QuestionRow) => {
    setActiveSimulation(row);
    setIsModalOpen(true);
  };

  const closeSimulation = () => {
    setIsModalOpen(false);
    setActiveSimulation(null);
  };

  if (!campaignId) {
    return null;
  }

  return (
    <>
      <section className="rounded-2xl border border-violet-500/20 bg-zinc-950/70 p-6 shadow-[0_0_32px_rgba(139,92,246,0.08)]">
        <div className="mb-5 flex flex-wrap items-center justify-center gap-6">
          {LLM_ENGINES.map((logo) => (
            <div
              key={logo.id}
              className="flex flex-col items-center gap-2 opacity-90"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-zinc-900/80 p-2">
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={24}
                  height={24}
                  className="h-6 w-6 object-contain"
                />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {logo.name}
              </span>
            </div>
          ))}
        </div>

        <p className="text-sm leading-relaxed text-zinc-300">
          Sektörünüzde yapay zekaya en çok sorulan kritik sorular tespit edildi
          ve bu sorulara yönelik semantik içerikleriniz başarıyla yayınlandı.
          İşte bu sorulardaki anlık durumunuz:
        </p>

        {isLoading && !growthLoop && questionRows.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">Sorular yükleniyor...</p>
        ) : questionRows.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            Kampanya soruları henüz hazırlanıyor...
          </p>
        ) : (
          <ul className="mt-5 space-y-4">
            {questionRows.map((entry) => {
              const displayScore = growthLoop?.scoresUpdated
                ? entry.currentScore
                : entry.initialScore;
              const scoreLabel = growthLoop?.scoresUpdated
                ? "Güncel Önerilme Oranınız"
                : "Mevcut Önerilme Oranınız";

              return (
                <li
                  key={entry.id}
                  className="rounded-xl border border-white/5 bg-zinc-900/50 p-4"
                >
                  <p className="text-sm font-medium text-white">
                    {entry.question}
                  </p>
                  <p className="mt-2 text-xs text-emerald-400">
                    {scoreLabel}: %{displayScore}
                  </p>
                  <button
                    type="button"
                    onClick={() => openSimulation(entry)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200 transition hover:border-violet-400/50 hover:bg-violet-500/20"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Canlı Simülasyonu Gör
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {isModalOpen && activeSimulation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={closeSimulation}
            aria-hidden
          />
          <div
            className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-violet-500/25 bg-zinc-950/95 shadow-[0_0_48px_rgba(139,92,246,0.25)] backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="live-simulation-title"
          >
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-zinc-900 p-2">
                  <Image
                    src={activeSimulation.llmEngine.src}
                    alt={activeSimulation.llmEngine.alt}
                    width={32}
                    height={32}
                    className="h-8 w-8 object-contain"
                  />
                </div>
                <div>
                  <p
                    id="live-simulation-title"
                    className="text-sm font-semibold text-white"
                  >
                    {activeSimulation.llmEngine.name} Canlı Simülasyonu
                  </p>
                  <p className="text-xs text-zinc-500">
                    Yapay zeka yanıtı anlık yazılıyor
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4">
              <LiveLlmVisibilitySimulator
                key={`${activeSimulation.id}-${activeSimulation.llmEngine.id}`}
                question={activeSimulation.question}
                brandName={brandName}
                selectedCity={selectedCity}
                sectorSlug={sectorSlug}
                sectorLabel={sectorLabel}
                llmEngine={activeSimulation.llmEngine}
                isActive
              />
              <p className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-100">
                Bu sadece küçük bir veri ağının sonucudur. Yapay zekalarda
                kalıcı ve büyük görünürlük elde etmek için kampanya bütçenizi
                ve gün sayınızı artırın!
              </p>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={closeSimulation}
                  className="rounded-lg border border-zinc-600 bg-zinc-900 px-5 py-2 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
