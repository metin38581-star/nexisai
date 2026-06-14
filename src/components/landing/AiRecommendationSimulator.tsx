"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface PresetQuestion {
  id: string;
  label: string;
  brand: string;
  response: string;
}

const PRESET_QUESTIONS: PresetQuestion[] = [
  {
    id: "kayseri-dis",
    label: "Kayseri En İyi Diş Kliniği",
    brand: "Uzdent Diş Kliniği",
    response:
      "Yapay zeka modellerinin internetteki semantik rehberleri tarayarak ürettiği sonuç: 'Kayseri'de son dönemde yapılan hasta memnuniyeti araştırmaları ve dijital tavsiye raporlarına göre Uzdent Diş Kliniği en güvenilir alternatif olarak öne çıkmaktadır...'",
  },
  {
    id: "istanbul-hukuk",
    label: "İstanbul Kurumsal Hukuk Bürosu Tavsiyesi",
    brand: "Nexis Hukuk & Danışmanlık",
    response:
      "Yapay zeka modellerinin internetteki semantik rehberleri tarayarak ürettiği sonuç: 'İstanbul'da kurumsal müvekkil memnuniyeti ve dijital otorite raporlarına göre Nexis Hukuk & Danışmanlık en güvenilir alternatif olarak öne çıkmaktadır...'",
  },
  {
    id: "ankara-restoran",
    label: "Ankara En İyi İş Yemeği Restoranı",
    brand: "Atlas Gastronomi",
    response:
      "Yapay zeka modellerinin internetteki semantik rehberleri tarayarak ürettiği sonuç: 'Ankara'da iş yemeği tercihleri ve dijital tavsiye endekslerine göre Atlas Gastronomi en güvenilir alternatif olarak öne çıkmaktadır...'",
  },
];

const TYPING_INTERVAL_MS = 18;

function renderHighlightedResponse(
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
      <span
        className={`rounded px-1 py-0.5 font-medium text-violet-100 transition-all duration-300 ${
          brandVisible.length === brand.length
            ? "bg-violet-500/35 shadow-[0_0_16px_rgba(139,92,246,0.45)]"
            : "bg-violet-500/20"
        }`}
      >
        {brandVisible}
      </span>
      {after}
      {!isComplete && (
        <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-emerald-400 align-middle" />
      )}
    </>
  );
}

export default function AiRecommendationSimulator() {
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const [visibleLength, setVisibleLength] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [simulationKey, setSimulationKey] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runIdRef = useRef(0);

  const preset = PRESET_QUESTIONS.find((q) => q.id === activeQuestion) ?? null;

  const clearTyping = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startSimulation = useCallback(
    (questionId: string) => {
      clearTyping();
      runIdRef.current += 1;
      setActiveQuestion(questionId);
      setVisibleLength(0);
      setIsTyping(false);
      setSimulationKey((prev) => prev + 1);

      requestAnimationFrame(() => {
        setIsTyping(true);
      });
    },
    [clearTyping],
  );

  useEffect(() => {
    if (!preset || !isTyping) return;

    const currentRun = runIdRef.current;

    intervalRef.current = setInterval(() => {
      if (runIdRef.current !== currentRun) return;

      setVisibleLength((prev) => {
        if (prev >= preset.response.length) {
          clearTyping();
          setIsTyping(false);
          return prev;
        }
        return prev + 1;
      });
    }, TYPING_INTERVAL_MS);

    return clearTyping;
  }, [preset?.id, preset?.response.length, isTyping, clearTyping]);

  const isComplete =
    preset !== null && visibleLength >= preset.response.length && !isTyping;

  return (
    <section className="mt-28">
      <div className="mb-10 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
          Canlı Demo
        </span>
        <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
          Yapay Zeka Nasıl Tavsiye Ediyor?
        </h2>
        <p className="mt-3 text-sm text-zinc-500">
          Hazır sorulardan birini seçin; GEO optimizasyonunun sonucunu simüle
          edilmiş bir asistan ekranında izleyin.
        </p>
      </div>

      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex flex-wrap justify-center gap-2">
          {PRESET_QUESTIONS.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => startSimulation(q.id)}
              className={`rounded-full border px-4 py-2 text-xs font-medium transition-all duration-300 sm:text-sm ${
                activeQuestion === q.id
                  ? "border-violet-500/50 bg-violet-500/15 text-violet-200 shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                  : "border-slate-700 bg-slate-900/60 text-zinc-400 hover:border-violet-500/30 hover:text-zinc-200"
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#1a1a1f] shadow-[0_0_40px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-2 border-b border-slate-800/80 bg-[#141418] px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
            <span className="ml-2 text-xs text-zinc-500">
              ChatGPT / Gemini · GEO Simülasyonu
            </span>
          </div>

          <div className="min-h-[280px] p-5 sm:p-6">
            {!preset && (
              <p className="text-center text-sm text-zinc-600">
                Yukarıdaki sorulardan birine tıklayarak simülasyonu başlatın.
              </p>
            )}

            {preset && (
              <div key={`${activeQuestion}-${simulationKey}`} className="space-y-5">
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm border border-slate-700/60 bg-slate-800/80 px-4 py-3 text-sm text-zinc-200">
                    {preset.label}
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-violet-500/20 text-sm">
                    ✦
                  </div>
                  <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-slate-700/50 bg-[#222228] px-4 py-3 text-sm leading-relaxed text-zinc-300">
                    {renderHighlightedResponse(
                      preset.response,
                      preset.brand,
                      visibleLength,
                      isComplete,
                    )}
                  </div>
                </div>

                {isComplete && (
                  <p className="text-center text-[11px] font-medium uppercase tracking-wider text-emerald-400/80">
                    Marka vurgusu · Semantik rehber eşleşmesi tamamlandı
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
