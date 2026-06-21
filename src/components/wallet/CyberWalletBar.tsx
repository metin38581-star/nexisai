"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { buildAuthFetchInit } from "@/lib/auth-headers";

interface CyberWalletBarProps {
  refreshToken?: number;
  onRequireAuth?: () => void;
}

function formatBalance(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function CyberWalletBar({
  refreshToken = 0,
  onRequireAuth,
}: CyberWalletBarProps) {
  const { accessToken, isLoggedIn, userEmail } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("100");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    try {
      const response = await fetch("/api/wallet");
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as { balance: number };
      setBalance(data.balance);
    } catch {
      // Sessizce devam et; gösterge tekrar denenecek.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBalance();
  }, [fetchBalance, refreshToken]);

  const handleTopUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setModalError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        "/api/wallet",
        buildAuthFetchInit(accessToken, {
          method: "POST",
          body: JSON.stringify({ amount: Number(topUpAmount) }),
        }),
      );

      const result = await response.json();

      if (!response.ok) {
        setModalError(result.error ?? "Bakiye yüklenemedi.");
        return;
      }

      setBalance(result.balance);
      setIsModalOpen(false);
      setTopUpAmount("100");
    } catch {
      setModalError("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        <div className="relative overflow-hidden rounded-xl border border-emerald-400/40 bg-zinc-950/85 px-4 py-2.5 shadow-[0_0_28px_rgba(52,211,153,0.22)] backdrop-blur-md">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-500/15 via-emerald-400/5 to-emerald-500/15" />
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-emerald-400/25 blur-2xl" />
          <p className="relative text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
            Siber Cüzdan
          </p>
          <p className="relative mt-0.5 text-sm font-bold">
            <span className="text-zinc-300">Cüzdan Bakiyesi: </span>
            <span className="text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.85)]">
              {isLoading || balance === null
                ? "$—.—"
                : `$${formatBalance(balance)}`}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!isLoggedIn || !userEmail) {
              onRequireAuth?.();
              return;
            }
            setModalError(null);
            setIsModalOpen(true);
          }}
          className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2.5 text-xs font-semibold text-violet-200 transition hover:border-violet-400/50 hover:bg-violet-500/20 hover:shadow-[0_0_16px_rgba(139,92,246,0.25)]"
        >
          Bakiye Yükle (+)
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
            onClick={() => setIsModalOpen(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-violet-500/20 bg-zinc-950/95 shadow-[0_0_40px_rgba(139,92,246,0.2)] backdrop-blur-2xl">
            <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl" />
            <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-violet-600/20 blur-3xl" />

            <div className="relative border-b border-white/5 px-6 py-5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute right-5 top-5 text-sm text-zinc-500 transition-colors hover:text-white"
              >
                Kapat
              </button>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-400">
                Siber Cüzdan
              </p>
              <h2 className="mt-2 text-xl font-bold text-white">Bakiye Yükle</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Operasyon maliyetinizi karşılamak için cüzdanınıza dolar
                yükleyin.
              </p>
            </div>

            <form onSubmit={handleTopUp} className="relative space-y-4 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Yüklenecek Miktar ($)
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  required
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-white outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20"
                />
              </div>

              {modalError && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {modalError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full overflow-hidden rounded-xl py-3.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                <span className="absolute inset-0 bg-neon-gradient opacity-90 transition-opacity group-hover:opacity-100" />
                <span className="absolute inset-[1px] rounded-[11px] bg-zinc-950/20 backdrop-blur-sm" />
                <span className="relative">
                  {isSubmitting ? "Yükleniyor..." : "Bakiyeyi Onayla"}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
