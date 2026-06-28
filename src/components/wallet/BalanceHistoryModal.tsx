"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

import { buildAuthFetchInit } from "@/lib/auth-headers";

export interface WalletHistoryEntry {
  id: string;
  amount: number;
  currency: string;
  status: string;
  statusLabel: string;
  typeLabel: string;
  createdAt: string;
}

interface BalanceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
}

function formatHistoryDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(amount: number, currency: string): string {
  const normalizedCurrency = currency === "USD" ? "TRY" : currency;
  return `${amount.toLocaleString("tr-TR")} ${normalizedCurrency === "TRY" ? "₺" : normalizedCurrency}`;
}

function resolveStatusClass(statusLabel: string): string {
  if (statusLabel === "Başarılı") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }
  if (statusLabel === "Beklemede") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }
  return "border-red-500/30 bg-red-500/10 text-red-300";
}

export default function BalanceHistoryModal({
  isOpen,
  onClose,
  accessToken,
}: BalanceHistoryModalProps) {
  const [entries, setEntries] = useState<WalletHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!accessToken) {
      setErrorMessage("Oturum bulunamadı.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        "/api/wallet/history",
        buildAuthFetchInit(accessToken),
      );
      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
        entries?: WalletHistoryEntry[];
      };

      if (!response.ok || !data.success) {
        setErrorMessage(data.error ?? "Bakiye geçmişi yüklenemedi.");
        return;
      }

      setEntries(data.entries ?? []);
    } catch {
      setErrorMessage("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void fetchHistory();
  }, [fetchHistory, isOpen]);

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
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-violet-500/25 bg-zinc-950/95 shadow-[0_0_48px_rgba(139,92,246,0.25)] backdrop-blur-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="balance-history-title"
      >
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-400">
              Finansal Şeffaflık
            </p>
            <h2 id="balance-history-title" className="text-lg font-semibold text-white">
              Bakiye Geçmişi
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 bg-zinc-900 p-1.5 text-zinc-400 transition-colors hover:text-white"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
              Bakiye kayıtları yükleniyor...
            </div>
          ) : errorMessage ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {errorMessage}
            </p>
          ) : entries.length === 0 ? (
            <p className="rounded-lg border border-zinc-700/50 bg-zinc-900/50 px-4 py-8 text-center text-sm text-zinc-400">
              Henüz kayıtlı bir bakiye yükleme işleminiz bulunmuyor.
            </p>
          ) : (
            <ul className="space-y-3">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-xl border border-white/5 bg-zinc-900/60 p-4 transition-colors duration-200 hover:border-violet-500/20 hover:bg-zinc-900/80"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-100">
                        {entry.typeLabel}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {formatHistoryDate(entry.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-300">
                        +{formatAmount(entry.amount, entry.currency)}
                      </p>
                      <span
                        className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${resolveStatusClass(entry.statusLabel)}`}
                      >
                        {entry.statusLabel}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-white/5 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition-colors duration-200 hover:border-zinc-500 hover:bg-zinc-800"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
