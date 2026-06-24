"use client";

import { useState } from "react";
import { DEFAULT_WALLET_TOPUP_TL } from "@/lib/wallet-constants";
import { useAuth } from "@/context/AuthContext";
import { buildAuthFetchInit } from "@/lib/auth-headers";

interface WalletTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}

export default function WalletTopUpModal({
  isOpen,
  onClose,
  onSuccess,
}: WalletTopUpModalProps) {
  const { accessToken } = useAuth();
  const [topUpAmount, setTopUpAmount] = useState(String(DEFAULT_WALLET_TOPUP_TL));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!accessToken) {
      setErrorMessage("Bakiye yüklemek için oturum açmanız gerekiyor.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        "/api/wallet",
        buildAuthFetchInit(accessToken, {
          method: "POST",
          body: JSON.stringify({
            amount: Number(topUpAmount),
            operation: "topup",
          }),
        }),
      );

      const result = await response.json();

      if (!response.ok) {
        setErrorMessage(result.error ?? "Bakiye yüklenemedi.");
        return;
      }

      if (result.requiresPayment && result.paymentPageUrl) {
        window.location.href = result.paymentPageUrl as string;
        return;
      }

      onSuccess(result.balance as number);
      onClose();
    } catch {
      setErrorMessage("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-md rounded-2xl border border-violet-500/20 bg-zinc-950/95 p-6 shadow-[0_0_40px_rgba(139,92,246,0.2)]">
        <h2 className="text-xl font-bold text-white">Cüzdan Bakiyesi Yetersiz</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Anahtar kelime kilidini açmak için önce cüzdanınıza bakiye yükleyin.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Yüklenecek Miktar (₺)
            </label>
            <input
              type="number"
              min={1}
              step={1}
              required
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-white outline-none focus:border-violet-500/40"
            />
          </div>

          {errorMessage ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-neon-gradient py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isSubmitting ? "Yükleniyor..." : "Bakiyeyi Onayla"}
          </button>
        </form>
      </div>
    </div>
  );
}
