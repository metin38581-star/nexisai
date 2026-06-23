"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import RegisterWalletModal3D from "@/components/wallet/RegisterWalletModal3D";

interface CyberWalletBarProps {
  refreshToken?: number;
  onRequireAuth?: () => void;
}

function formatBalance(value: number): string {
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function CyberWalletBar({
  refreshToken = 0,
}: CyberWalletBarProps) {
  const { isLoggedIn } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchBalance = useCallback(async () => {
    try {
      const response = await fetch("/api/wallet");
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as { balance: number };
      setBalance(data.balance);
    } catch {
      // Sessizce devam et.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBalance();
  }, [fetchBalance, refreshToken]);

  const modalMode = isLoggedIn ? "wallet" : "register";

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
                ? "— ₺"
                : `${formatBalance(balance)} ₺`}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="dc-wallet-pulse rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2.5 text-xs font-semibold text-violet-200 transition hover:border-violet-400/50 hover:bg-violet-500/20"
        >
          Bakiye Yükle (+)
        </button>
      </div>

      <RegisterWalletModal3D
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        onWalletSuccess={() => {
          void fetchBalance();
        }}
      />
    </>
  );
}
