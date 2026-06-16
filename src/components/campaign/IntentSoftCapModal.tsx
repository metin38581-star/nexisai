"use client";

import { Lock, Zap } from "lucide-react";

interface IntentSoftCapModalProps {
  isOpen: boolean;
  currentCap: number;
  nextCap: number;
  budgetIncrease: number;
  onClose: () => void;
  onConfirm: () => void;
  isProcessing?: boolean;
}

export default function IntentSoftCapModal({
  isOpen,
  currentCap,
  nextCap,
  budgetIncrease,
  onClose,
  onConfirm,
  isProcessing = false,
}: IntentSoftCapModalProps) {
  if (!isOpen) {
    return null;
  }

  const capGain = Math.max(0, nextCap - currentCap);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-amber-500/30 bg-zinc-950/95 shadow-[0_0_40px_rgba(245,158,11,0.15)]">
        <div className="border-b border-white/5 px-6 py-5">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
            <Lock className="h-6 w-6 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-white">
            Soru Seçim Limitine Ulaştınız
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Mevcut günlük bütçenizle en fazla {currentCap} soru seçebilirsiniz.
            {capGain > 0 ? (
              <>
                {" "}
                Bütçenizi ${budgetIncrease} artırarak limiti {nextCap} soruya
                çıkarabilir ve bu arama konusunu da ekleyebilirsiniz.
              </>
            ) : (
              <>
                {" "}
                Maksimum bütçe seviyesindesiniz; ek slot için bütçe artırımı
                yerine mevcut seçimlerinizden birini kaldırın.
              </>
            )}
          </p>
        </div>

        <div className="flex flex-col gap-3 p-6">
          {capGain > 0 ? (
            <button
              type="button"
              onClick={onConfirm}
              disabled={isProcessing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              <Zap className="h-4 w-4" />
              {isProcessing
                ? "İşleniyor..."
                : `Bütçeyi $${budgetIncrease} Artır & Ekle`}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-400 transition hover:text-white"
          >
            Vazgeç
          </button>
        </div>
      </div>
    </div>
  );
}
