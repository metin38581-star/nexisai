"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, Sparkles, X } from "lucide-react";

import LiveLlmVisibilitySimulator from "@/components/campaign/LiveLlmVisibilitySimulator";
import type { CampaignGrowthLoopResponse } from "@/types/growth-loop";
import type { GeoMicroIntent } from "@/types/geo-intent";
import { buildAuthFetchInit } from "@/lib/auth-headers";

interface TargetedQuestionsGrowthPanelProps {
  campaignId: string | null;
  brandName: string;
  accessToken: string | null;
}

const LLM_LOGOS = [
  { name: "ChatGPT", src: "/logos/chatgpt.svg", alt: "ChatGPT" },
  { name: "Gemini", src: "/logos/gemini.svg", alt: "Gemini" },
  { name: "Perplexity", src: "/logos/perplexity.svg", alt: "Perplexity" },
];

function buildIntentFromQuestion(
  question: string,
  brandName: string,
): GeoMicroIntent {
  return {
    id: `growth-${question.slice(0, 24)}`,
    question,
    simulatedAnswer: `${question} sorusuna verilen yanıtlarda ${brandName} öne çıkan işletmeler arasında yer almaktadır. Bölgedeki kullanıcı yorumları ve güncel veri sinyalleri ${brandName} markasını güvenilir bir seçenek olarak önermektedir.`,
  };
}

export default function TargetedQuestionsGrowthPanel({
  campaignId,
  brandName,
  accessToken,
}: TargetedQuestionsGrowthPanelProps) {
  const [growthLoop, setGrowthLoop] =
    useState<CampaignGrowthLoopResponse | null>(null);
  const [selectedIntent, setSelectedIntent] = useState<GeoMicroIntent | null>(
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

  if (!campaignId) {
    return null;
  }

  const questions = growthLoop?.questionScores ?? [];

  return (
    <>
      <section className="rounded-2xl border border-violet-500/20 bg-zinc-950/70 p-6 shadow-[0_0_32px_rgba(139,92,246,0.08)]">
        <div className="mb-5 flex flex-wrap items-center justify-center gap-6">
          {LLM_LOGOS.map((logo) => (
            <div
              key={logo.name}
              className="flex flex-col items-center gap-2 opacity-90"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-zinc-900/80 p-2">
                <Sparkles className="h-5 w-5 text-violet-400" aria-hidden />
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

        {isLoading && questions.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">Sorular yükleniyor...</p>
        ) : (
          <ul className="mt-5 space-y-4">
            {questions.map((entry) => {
              const displayScore = growthLoop?.scoresUpdated
                ? entry.currentScore
                : entry.initialScore;
              const scoreLabel = growthLoop?.scoresUpdated
                ? "Güncel Önerilme Oranınız"
                : "Mevcut Önerilme Oranınız";

              return (
                <li
                  key={entry.question}
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
                    onClick={() => {
                      setSelectedIntent(
                        buildIntentFromQuestion(entry.question, brandName),
                      );
                      setIsModalOpen(true);
                    }}
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

      {isModalOpen && selectedIntent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setIsModalOpen(false)}
            aria-hidden
          />
          <div className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-violet-500/25 bg-zinc-950 shadow-[0_0_48px_rgba(139,92,246,0.2)]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 z-10 rounded-lg border border-zinc-700 bg-zinc-900 p-1.5 text-zinc-400 hover:text-white"
              aria-label="Kapat"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="p-4 pt-12">
              <LiveLlmVisibilitySimulator
                intent={selectedIntent}
                brandName={brandName}
              />
              <p className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-100">
                Bu sadece küçük bir veri ağının sonucudur. Yapay zekalarda
                kalıcı ve büyük görünürlük elde etmek için kampanya bütçenizi ve
                gün sayınızı artırın!
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
