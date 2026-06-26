"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Crown, Lock, Sparkles } from "lucide-react";

import type { BusinessSector } from "@/types/campaign";
import {
  GOLD_QUESTION_BUDGET_THRESHOLD,
  isGoldQuestionBudgetUnlocked,
  isGoldQuestionId,
  resolveBudgetUnlockHint,
} from "@/constants/campaign";
import {
  fillQuestionTemplate,
  getCoreQuestionsForSector,
  isCoreQuestionSectorSupported,
  resolveCoreQuestionSector,
  resolveMaxSelection,
} from "@/lib/core-questions";
import { getCityLabel } from "@/lib/constants";
import type { TurkishCitySlug } from "@/lib/turkey-cities";
import "@/components/campaign/budget-operation-tier.css";

interface CoreQuestionsPanelProps {
  sector: BusinessSector | "";
  city: TurkishCitySlug | "";
  dailyBudget: number;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export default function CoreQuestionsPanel({
  sector,
  city,
  dailyBudget,
  selectedIds,
  onSelectionChange,
}: CoreQuestionsPanelProps) {
  const previousMaxRef = useRef(0);
  const previousBudgetRef = useRef(dailyBudget);
  const [goldUnlockAnimating, setGoldUnlockAnimating] = useState(false);

  const maxSelection = resolveMaxSelection(dailyBudget, sector);
  const coreSector = resolveCoreQuestionSector(sector);
  const cityLabel = city ? getCityLabel(city) : "Şehriniz";
  const goldBudgetUnlocked = isGoldQuestionBudgetUnlocked(dailyBudget);

  const questions = useMemo(() => {
    if (!coreSector) {
      return [];
    }

    return getCoreQuestionsForSector(coreSector);
  }, [coreSector]);

  const unlockHint = goldBudgetUnlocked
    ? resolveBudgetUnlockHint(dailyBudget)
    : `Altın sorular ${GOLD_QUESTION_BUDGET_THRESHOLD.toLocaleString("tr-TR")} TL'de açılır`;
  const selectionRatio =
    maxSelection > 0 ? Math.min(selectedIds.length / maxSelection, 1) : 0;
  const budgetIncreased = maxSelection > previousMaxRef.current;

  useEffect(() => {
    previousMaxRef.current = maxSelection;
  }, [maxSelection]);

  useEffect(() => {
    const crossedGoldThreshold =
      previousBudgetRef.current < GOLD_QUESTION_BUDGET_THRESHOLD &&
      dailyBudget >= GOLD_QUESTION_BUDGET_THRESHOLD;

    previousBudgetRef.current = dailyBudget;

    if (!crossedGoldThreshold) {
      return;
    }

    setGoldUnlockAnimating(true);
    const timer = window.setTimeout(() => setGoldUnlockAnimating(false), 900);
    return () => window.clearTimeout(timer);
  }, [dailyBudget]);

  useEffect(() => {
    if (goldBudgetUnlocked) {
      return;
    }

    const withoutGold = selectedIds.filter((id) => !isGoldQuestionId(id));
    if (withoutGold.length !== selectedIds.length) {
      onSelectionChange(withoutGold);
    }
  }, [goldBudgetUnlocked, onSelectionChange, selectedIds]);

  useEffect(() => {
    if (!isCoreQuestionSectorSupported(sector) || maxSelection === 0) {
      if (selectedIds.length > 0) {
        onSelectionChange([]);
      }
      return;
    }

    if (selectedIds.length > maxSelection) {
      onSelectionChange(selectedIds.slice(0, maxSelection));
    }
  }, [maxSelection, onSelectionChange, sector, selectedIds]);

  const toggleQuestion = (id: string) => {
    if (isGoldQuestionId(id) && !goldBudgetUnlocked) {
      return;
    }

    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((item) => item !== id));
      return;
    }

    if (selectedIds.length >= maxSelection) {
      return;
    }

    onSelectionChange([...selectedIds, id]);
  };

  if (!isCoreQuestionSectorSupported(sector)) {
    return (
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5">
        <p className="text-sm font-medium text-amber-200">
          Kemik soru havuzu bu sektör için henüz hazır değil
        </p>
        <p className="mt-2 text-xs leading-relaxed text-amber-100/70">
          Kemik soru havuzu Diş Kliniği, Otel, Restoran, Güzellik & Estetik,
          Avukatlık & Hukuk, Evden Eve Nakliyat, Halı Yıkama, Oto Servis &
          Ekspertiz ve Sürücü Kursu için 15&apos;er adet kısa soru sunuyor.
          Lütfen desteklenen sektörlerden birini seçin.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-violet-500/20 bg-zinc-950/60 p-5 transition-shadow duration-500 ${
        budgetIncreased || goldUnlockAnimating
          ? "shadow-[0_0_32px_rgba(139,92,246,0.25)]"
          : ""
      }`}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-200">
            <Sparkles className="h-3.5 w-3.5" />
            15 Kemik Soru Havuzu
          </div>
          <h3 className="text-base font-semibold text-white">
            Hedef Sorularınızı Seçin
          </h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-400">
            Altın GEO soruları yüksek dönüşüm hedefler —{" "}
            {GOLD_QUESTION_BUDGET_THRESHOLD.toLocaleString("tr-TR")} TL ve üzeri
            bütçede aktifleşir. Toplam 15 kısa ve net arama sorusu.
          </p>
        </div>

        <div className="min-w-[180px] rounded-xl border border-violet-500/25 bg-violet-500/10 px-4 py-3 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300">
            Seçim Limiti
          </p>
          <p
            className={`mt-1 text-2xl font-bold tabular-nums text-white transition-transform duration-300 ${
              budgetIncreased ? "scale-110 text-emerald-300" : ""
            }`}
          >
            {selectedIds.length}
            <span className="text-base font-medium text-zinc-500">
              {" "}
              / {maxSelection}
            </span>
          </p>
          <p className="mt-1 text-[11px] text-zinc-400">{unlockHint}</p>
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
          <span>{questions.length} soru havuzda</span>
        </div>
      </div>

      <div className="grid max-h-[420px] grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
        {questions.map((question) => {
          const isSelected = selectedIds.includes(question.id);
          const isGold = question.isGold;
          const isGoldBudgetLocked = isGold && !goldBudgetUnlocked;
          const isSelectionLimitLocked =
            !isSelected && selectedIds.length >= maxSelection && maxSelection > 0;
          const isDisabled = isGoldBudgetLocked || isSelectionLimitLocked;
          const label = fillQuestionTemplate(question.template, cityLabel);
          const showGoldUnlockGlow =
            isGold && goldBudgetUnlocked && goldUnlockAnimating;

          return (
            <button
              key={question.id}
              type="button"
              disabled={isDisabled}
              onClick={() => toggleQuestion(question.id)}
              className={`group relative rounded-xl border px-4 py-3 text-left transition-all duration-500 ${
                isSelected
                  ? isGold
                    ? "border-amber-400/50 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.18)]"
                    : "border-emerald-400/40 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                  : isDisabled
                    ? "cursor-not-allowed border-zinc-800 bg-zinc-900/40 opacity-60"
                    : isGold
                      ? "border-amber-500/25 bg-amber-500/5 hover:border-amber-400/40 hover:bg-amber-500/10"
                      : "border-zinc-800 bg-zinc-900/50 hover:border-violet-500/30 hover:bg-violet-500/5"
              } ${showGoldUnlockGlow ? "gold-question-unlock" : ""}`}
            >
              {isGold ? (
                <span
                  className={`mb-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-all duration-500 ${
                    isGoldBudgetLocked
                      ? "border-cyan-500/35 bg-cyan-500/10 text-cyan-200"
                      : "border-amber-400/35 bg-amber-500/15 text-amber-200"
                  }`}
                >
                  {isGoldBudgetLocked ? (
                    <>
                      <Lock className="h-3 w-3 text-cyan-300" />
                      Yüksek Dönüşümlü Altın Soru (Minimum 1.000 TL Bütçe)
                    </>
                  ) : (
                    <>
                      <Crown className="h-3 w-3" />
                      Altın GEO Sorusu
                    </>
                  )}
                </span>
              ) : null}
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                    isSelected
                      ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                      : isDisabled
                        ? "border-zinc-700 bg-zinc-800 text-zinc-500"
                        : "border-zinc-600 bg-zinc-900 text-zinc-400 group-hover:border-violet-400"
                  }`}
                >
                  {isSelected ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : isGoldBudgetLocked ? (
                    <Lock className="h-3 w-3 text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                  ) : isSelectionLimitLocked ? (
                    <Lock className="h-3 w-3" />
                  ) : null}
                </span>
                <span
                  className={`text-xs leading-relaxed ${
                    isGoldBudgetLocked ? "text-zinc-400" : "text-zinc-200"
                  }`}
                >
                  {label}
                </span>
              </div>
              {isGoldBudgetLocked ? (
                <span className="mt-2 block text-[10px] font-medium text-cyan-300/90">
                  Bütçeyi {GOLD_QUESTION_BUDGET_THRESHOLD.toLocaleString("tr-TR")}{" "}
                  TL&apos;ye çıkarın — altın sorular neon kilidi açar
                </span>
              ) : null}
              {isSelectionLimitLocked && !isGoldBudgetLocked ? (
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
