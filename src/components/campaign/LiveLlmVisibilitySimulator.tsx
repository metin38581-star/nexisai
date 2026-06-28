"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

import {
  buildVisibilitySimulationContent,
  type LlmEngine,
} from "@/lib/llm-visibility-ui";

const TYPING_INTERVAL_MS = 16;

interface LiveLlmVisibilitySimulatorProps {
  question: string;
  brandName: string;
  selectedCity?: string | null;
  llmEngine: LlmEngine;
  isActive: boolean;
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
      <span className="rounded bg-violet-500/30 px-1 py-0.5 font-bold text-violet-100 shadow-[0_0_12px_rgba(139,92,246,0.35)]">
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
  question,
  brandName,
  selectedCity,
  llmEngine,
  isActive,
}: LiveLlmVisibilitySimulatorProps) {
  const [typedQuestion, setTypedQuestion] = useState("");
  const [typedAnswerPrefix, setTypedAnswerPrefix] = useState("");
  const [typedAnswerBody, setTypedAnswerBody] = useState("");
  const [phase, setPhase] = useState<
    "idle" | "question" | "answer-prefix" | "answer-body"
  >("idle");
  const timerRef = useRef<number | null>(null);

  const content = buildVisibilitySimulationContent(
    question,
    selectedCity,
    brandName,
    llmEngine.name,
  );
  const questionText = question.trim();

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearTimer();

    if (!isActive) {
      setTypedQuestion("");
      setTypedAnswerPrefix("");
      setTypedAnswerBody("");
      setPhase("idle");
      return;
    }

    setTypedQuestion("");
    setTypedAnswerPrefix("");
    setTypedAnswerBody("");
    setPhase("question");

    let qIndex = 0;

    timerRef.current = window.setInterval(() => {
      qIndex += 1;
      setTypedQuestion(questionText.slice(0, qIndex));

      if (qIndex >= questionText.length) {
        clearTimer();
        setPhase("answer-prefix");
        let prefixIndex = 0;

        timerRef.current = window.setInterval(() => {
          prefixIndex += 1;
          setTypedAnswerPrefix(content.answerPrefix.slice(0, prefixIndex));

          if (prefixIndex >= content.answerPrefix.length) {
            clearTimer();
            setPhase("answer-body");
            let bodyIndex = 0;

            timerRef.current = window.setInterval(() => {
              bodyIndex += 1;
              setTypedAnswerBody(content.answerBody.slice(0, bodyIndex));
              if (bodyIndex >= content.answerBody.length) {
                clearTimer();
              }
            }, TYPING_INTERVAL_MS);
          }
        }, TYPING_INTERVAL_MS);
      }
    }, TYPING_INTERVAL_MS);

    return clearTimer;
  }, [
    clearTimer,
    content.answerBody,
    content.answerPrefix,
    isActive,
    questionText,
  ]);

  const answerComplete =
    typedAnswerBody.length >= content.answerBody.length &&
    phase === "answer-body";

  return (
    <div className="flex h-full min-h-[360px] flex-col overflow-hidden rounded-2xl border border-emerald-500/20 bg-zinc-950/80 shadow-[0_0_32px_rgba(16,185,129,0.08)]">
      <div className="flex items-center gap-3 border-b border-white/5 bg-zinc-900/80 px-4 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-zinc-950 p-1.5">
          <Image
            src={llmEngine.src}
            alt={llmEngine.alt}
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
          />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
            Canlı Simülasyon
          </p>
          <p className="text-sm font-medium text-zinc-200">{llmEngine.name}</p>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {!isActive ? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
            <p className="text-sm text-zinc-500">
              Simülasyon başlatılıyor...
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
              <p className="text-sm leading-relaxed text-zinc-200">
                <span className="font-semibold text-violet-200">Soru:</span>{" "}
                {typedQuestion}
                {phase === "question" && (
                  <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-violet-400 align-middle" />
                )}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <p className="text-sm leading-relaxed text-zinc-300">
                <span className="font-semibold text-emerald-300">
                  {typedAnswerPrefix}
                </span>
                {phase === "answer-prefix" && (
                  <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-emerald-400 align-middle" />
                )}
                {(phase === "answer-body" || typedAnswerBody.length > 0) && (
                  <>
                    {" "}
                    {highlightBrand(
                      typedAnswerBody,
                      content.brand,
                      typedAnswerBody.length,
                      answerComplete,
                    )}
                  </>
                )}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
