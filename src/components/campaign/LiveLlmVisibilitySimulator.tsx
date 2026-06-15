"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Sparkles } from "lucide-react";

import type { GeoMicroIntent } from "@/types/geo-intent";

const TYPING_INTERVAL_MS = 16;

interface LiveLlmVisibilitySimulatorProps {
  intent: GeoMicroIntent | null;
  brandName: string;
}

function highlightBrand(
  text: string,
  brand: string,
  visibleLength: number,
  isComplete: boolean,
) {
  const visible = text.slice(0, visibleLength);
  const brandIndex = text.indexOf(brand);

  if (brandIndex === -1 || visibleLength <= brandIndex) {
    return (
      <>
        {visible}
        {!isComplete && (
          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-emerald-400 align-middle" />
        )}
      </>
    );
  }

  const before = text.slice(0, brandIndex);
  const brandEnd = brandIndex + brand.length;
  const brandVisible = text.slice(brandIndex, Math.min(brandEnd, visibleLength));
  const after =
    visibleLength > brandEnd ? text.slice(brandEnd, visibleLength) : "";

  return (
    <>
      {before}
      <span className="rounded bg-violet-500/30 px-1 py-0.5 font-medium text-violet-100 shadow-[0_0_12px_rgba(139,92,246,0.35)]">
        {brandVisible}
      </span>
      {after}
      {!isComplete && (
        <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-emerald-400 align-middle" />
      )}
    </>
  );
}

export default function LiveLlmVisibilitySimulator({
  intent,
  brandName,
}: LiveLlmVisibilitySimulatorProps) {
  const [typedQuestion, setTypedQuestion] = useState("");
  const [typedAnswer, setTypedAnswer] = useState("");
  const [phase, setPhase] = useState<"idle" | "question" | "answer">("idle");
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearTimer();

    if (!intent) {
      setTypedQuestion("");
      setTypedAnswer("");
      setPhase("idle");
      return;
    }

    setTypedQuestion("");
    setTypedAnswer("");
    setPhase("question");

    const question = intent.question;
    const answer = intent.simulatedAnswer;
    let qIndex = 0;

    timerRef.current = window.setInterval(() => {
      qIndex += 1;
      setTypedQuestion(question.slice(0, qIndex));

      if (qIndex >= question.length) {
        clearTimer();
        setPhase("answer");
        let aIndex = 0;
        timerRef.current = window.setInterval(() => {
          aIndex += 1;
          setTypedAnswer(answer.slice(0, aIndex));
          if (aIndex >= answer.length) {
            clearTimer();
          }
        }, TYPING_INTERVAL_MS);
      }
    }, TYPING_INTERVAL_MS);

    return clearTimer;
  }, [intent, clearTimer]);

  return (
    <div className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl border border-emerald-500/20 bg-zinc-950/80 shadow-[0_0_32px_rgba(16,185,129,0.08)]">
      <div className="flex items-center gap-2 border-b border-white/5 bg-zinc-900/80 px-4 py-3">
        <Bot className="h-4 w-4 text-emerald-400" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
          Yapay Zeka Görünürlük Ekranı
        </p>
        <Sparkles className="ml-auto h-4 w-4 text-violet-400" />
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {!intent ? (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
            <Bot className="mb-3 h-10 w-10 text-zinc-600" />
            <p className="text-sm text-zinc-500">
              Bir arama hedefine tıklayın; ChatGPT/Gemini simülasyonu canlı
              başlasın.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-violet-400">
                Kullanıcı Sorgusu
              </p>
              <p className="text-sm leading-relaxed text-zinc-200">
                {typedQuestion}
                {phase === "question" && (
                  <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-violet-400 align-middle" />
                )}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                Simüle LLM Yanıtı
              </p>
              <p className="text-sm leading-relaxed text-zinc-300">
                {highlightBrand(
                  typedAnswer,
                  brandName,
                  typedAnswer.length,
                  typedAnswer.length >= intent.simulatedAnswer.length,
                )}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
