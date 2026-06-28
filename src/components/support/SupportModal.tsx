"use client";

import { Mail, MessageCircle, X } from "lucide-react";

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUPPORT_EMAIL = "support@nexisai.com";

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-violet-500/25 bg-zinc-950/95 p-6 shadow-[0_0_48px_rgba(139,92,246,0.25)] backdrop-blur-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-modal-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg border border-zinc-700 bg-zinc-900 p-1.5 text-zinc-400 transition-colors hover:text-white"
          aria-label="Kapat"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10">
          <MessageCircle className="h-6 w-6 text-violet-300" />
        </div>

        <h2 id="support-modal-title" className="text-xl font-semibold text-white">
          NexisAI Destek
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Kampanya operasyonları, cüzdan bakiyesi veya teknik konularda ekibimiz
          size yardımcı olmaya hazır.
        </p>

        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="mt-5 flex items-center gap-3 rounded-xl border border-violet-500/25 bg-violet-500/5 px-4 py-3 text-sm text-violet-200 transition-colors duration-200 hover:border-violet-400/40 hover:bg-violet-500/10"
        >
          <Mail className="h-4 w-4 shrink-0 text-violet-300" />
          <span>{SUPPORT_EMAIL}</span>
        </a>

        <p className="mt-4 text-xs text-zinc-500">
          Yanıt süresi: iş günlerinde 24 saat içinde.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition-colors duration-200 hover:border-zinc-500 hover:bg-zinc-800"
        >
          Kapat
        </button>
      </div>
    </div>
  );
}
