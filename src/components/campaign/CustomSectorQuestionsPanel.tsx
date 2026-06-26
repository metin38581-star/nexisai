"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";

import type { CustomAnchorQuestion } from "@/types/campaign";
import { CUSTOM_SECTOR_SLUG } from "@/lib/constants";
import {
  fillQuestionTemplate,
  pickDefaultCustomAnchorQuestionIds,
  resolveMaxSelection,
} from "@/lib/core-questions";
import { getCityLabel } from "@/lib/constants";
import type { TurkishCitySlug } from "@/lib/turkey-cities";
import "@/components/campaign/budget-operation-tier.css";

interface CustomSectorQuestionsPanelProps {
  customSector: string;
  city: TurkishCitySlug | "";
  dailyBudget: number;
  questions: CustomAnchorQuestion[];
  selectedIds: string[];
  isLoading: boolean;
  loadError: string | null;
  onQuestionsChange: (questions: CustomAnchorQuestion[]) => void;
  onLoadingChange: (loading: boolean) => void;
  onLoadErrorChange: (error: string | null) => void;
  onSelectionChange: (ids: string[]) => void;
}

export default function CustomSectorQuestionsPanel({
  customSector,
  city,
  dailyBudget,
  questions,
  selectedIds,
  isLoading,
  loadError,
  onQuestionsChange,
  onLoadingChange,
  onLoadErrorChange,
  onSelectionChange,
}: CustomSectorQuestionsPanelProps) {
  const previousMaxRef = useRef(0);
  const lastFetchKeyRef = useRef<string | null>(null);
  const [budgetPulse, setBudgetPulse] = useState(false);

  const maxSelection = resolveMaxSelection(dailyBudget, CUSTOM_SECTOR_SLUG);
  const cityLabel = city ? getCityLabel(city) : "Şehriniz";
  const trimmedSector = customSector.trim();
  const canFetch = trimmedSector.length >= 3;

  const selectionRatio =
    maxSelection > 0 ? Math.min(selectedIds.length / maxSelection, 1) : 0;
  const budgetIncreased = maxSelection > previousMaxRef.current;

  useEffect(() => {
    previousMaxRef.current = maxSelection;
  }, [maxSelection]);

  useEffect(() => {
    if (!budgetIncreased) {
      return;
    }

    setBudgetPulse(true);
    const timer = window.setTimeout(() => setBudgetPulse(false), 900);
    return () => window.clearTimeout(timer);
  }, [budgetIncreased]);

  useEffect(() => {
    if (!canFetch) {
      lastFetchKeyRef.current = null;
      onQuestionsChange([]);
      onSelectionChange([]);
      onLoadErrorChange(null);
      return;
    }

    const fetchKey = trimmedSector.toLowerCase();
    if (lastFetchKeyRef.current === fetchKey) {
      return;
    }

    const controller = new AbortController();
    lastFetchKeyRef.current = fetchKey;
    onLoadingChange(true);
    onLoadErrorChange(null);
    onSelectionChange([]);

    void (async () => {
      try {
        const response = await fetch("/api/campaign/sector-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customSector: trimmedSector }),
          signal: controller.signal,
        });

        const payload = (await response.json()) as {
          success?: boolean;
          questions?: CustomAnchorQuestion[];
          error?: string;
        };

        if (!response.ok || !payload.success || !payload.questions?.length) {
          throw new Error(payload.error ?? "Kemik sorular üretilemedi.");
        }

        onQuestionsChange(payload.questions);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        lastFetchKeyRef.current = null;
        onQuestionsChange([]);
        onLoadErrorChange(
          error instanceof Error
            ? error.message
            : "Kemik sorular yüklenemedi. Tekrar deneyin.",
        );
      } finally {
        if (!controller.signal.aborted) {
          onLoadingChange(false);
        }
      }
    })();

    return () => controller.abort();
  }, [
    canFetch,
    trimmedSector,
    onLoadErrorChange,
    onLoadingChange,
    onQuestionsChange,
    onSelectionChange,
  ]);

  useEffect(() => {
    if (questions.length === 0 || maxSelection === 0) {
      if (selectedIds.length > 0) {
        onSelectionChange([]);
      }
      return;
    }

    if (selectedIds.length > maxSelection) {
      onSelectionChange(selectedIds.slice(0, maxSelection));
      return;
    }

    if (selectedIds.length > 0) {
      return;
    }

    const defaults = pickDefaultCustomAnchorQuestionIds(questions, dailyBudget);
    if (defaults.length > 0) {
      onSelectionChange(defaults);
    }
  }, [
    dailyBudget,
    maxSelection,
    onSelectionChange,
    questions,
    selectedIds.length,
  ]);

  const sortedQuestions = useMemo(
    () =>
      [...questions].sort((left, right) => {
        const leftIndex = Number.parseInt(left.id.split("-").pop() ?? "0", 10);
        const rightIndex = Number.parseInt(right.id.split("-").pop() ?? "0", 10);
        return leftIndex - rightIndex;
      }),
    [questions],
  );

  const toggleQuestion = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((item) => item !== id));
      return;
    }

    if (selectedIds.length >= maxSelection) {
      return;
    }

    onSelectionChange([...selectedIds, id]);
  };

  if (!canFetch) {
    return (
      <div className="rounded-2xl border border-violet-500/25 bg-violet-500/5 p-5">
        <p className="text-sm font-medium text-violet-200">
          Niş sektör kemik soruları
        </p>
        <p className="mt-2 text-xs leading-relaxed text-violet-100/70">
          Özel sektör adını en az 3 karakter yazdığınızda yapay zeka bu iş koluna
          özel 15 kemik soru üretecek.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-violet-500/20 bg-zinc-950/60 p-8">
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-violet-300" />
          <p className="text-sm font-medium text-white">
            &quot;{trimmedSector}&quot; için 15 kemik soru üretiliyor…
          </p>
          <p className="max-w-md text-xs text-zinc-400">
            Google, Ekşi Sözlük ve KızlarSoruyor tarzı organik arama başlıkları
            hazırlanıyor.
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-5">
        <p className="text-sm font-medium text-red-200">Soru üretimi başarısız</p>
        <p className="mt-2 text-xs leading-relaxed text-red-100/80">{loadError}</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-violet-500/20 bg-zinc-950/60 p-5 transition-shadow duration-500 ${
        budgetPulse ? "shadow-[0_0_32px_rgba(139,92,246,0.25)]" : ""
      }`}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-200">
            <Sparkles className="h-3.5 w-3.5" />
            Niş Sektör — 15 Kemik Soru
          </div>
          <h3 className="text-base font-semibold text-white">
            {trimmedSector} için hedef sorular
          </h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-400">
            Bu 15 soru tamamen &quot;{trimmedSector}&quot; nişine özel üretildi.
            Bütçenize göre seçim yapın; forum motoru seçtiğiniz her soru için 4
            organik yorum thread&apos;i oluşturur.
          </p>
        </div>

        <div className="min-w-[180px] rounded-xl border border-violet-500/25 bg-violet-500/10 px-4 py-3 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300">
            Seçim Limiti
          </p>
          <p
            className={`mt-1 text-2xl font-bold tabular-nums text-white transition-transform duration-300 ${
              budgetPulse ? "scale-110 text-emerald-300" : ""
            }`}
          >
            {selectedIds.length}
            <span className="text-base font-medium text-zinc-500">
              {" "}
              / {maxSelection}
            </span>
          </p>
          <p className="mt-1 text-[11px] text-zinc-400">
            {questions.length} soru havuzda
          </p>
        </div>
      </div>

      <div className="mb-5">
        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 transition-all duration-500"
            style={{ width: `${selectionRatio * 100}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-zinc-500">
          <span>{dailyBudget.toLocaleString("tr-TR")} ₺ / gün</span>
          <span>15 niş kemik soru</span>
        </div>
      </div>

      <div className="grid max-h-[420px] grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
        {sortedQuestions.map((question) => {
          const isSelected = selectedIds.includes(question.id);
          const isSelectionLimitLocked =
            !isSelected && selectedIds.length >= maxSelection && maxSelection > 0;
          const label = fillQuestionTemplate(question.template, cityLabel);

          return (
            <button
              key={question.id}
              type="button"
              disabled={isSelectionLimitLocked}
              onClick={() => toggleQuestion(question.id)}
              className={`group relative rounded-xl border px-4 py-3 text-left transition-all duration-500 ${
                isSelected
                  ? "border-emerald-400/40 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                  : isSelectionLimitLocked
                    ? "cursor-not-allowed border-zinc-800 bg-zinc-900/40 opacity-60"
                    : "border-zinc-800 bg-zinc-900/50 hover:border-violet-500/30 hover:bg-violet-500/5"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                    isSelected
                      ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                      : isSelectionLimitLocked
                        ? "border-zinc-700 bg-zinc-800 text-zinc-500"
                        : "border-zinc-600 bg-zinc-900 text-zinc-400 group-hover:border-violet-400"
                  }`}
                >
                  {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
                <span className="text-xs leading-relaxed text-zinc-200">{label}</span>
              </div>
              {isSelectionLimitLocked ? (
                <span className="mt-2 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  Limit doldu — bütçeyi artırın
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
