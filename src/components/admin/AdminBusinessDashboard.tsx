"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronRight,
  Loader2,
  ShieldAlert,
  Users,
} from "lucide-react";

import type { AdminBusinessRow } from "@/types/admin";
import { useAuth } from "@/context/AuthContext";
import { buildAuthFetchInit } from "@/lib/auth-headers";
import BusinessDetailModal from "@/components/admin/BusinessDetailModal";
import BackgroundGlow from "@/components/layout/BackgroundGlow";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(amount: number, currency: string): string {
  const symbol = currency === "TRY" ? "₺" : "$";
  return `${symbol}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function AdminBusinessDashboard() {
  const { accessToken } = useAuth();
  const [businesses, setBusinesses] = useState<AdminBusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/businesses", {
        credentials: "include",
        ...(accessToken ? buildAuthFetchInit(accessToken) : {}),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
        businesses?: AdminBusinessRow[];
      };

      if (!response.ok) {
        setError(payload.error ?? "İşletme listesi alınamadı.");
        setBusinesses([]);
        return;
      }

      setBusinesses(payload.businesses ?? []);
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void fetchBusinesses();
  }, [fetchBusinesses]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black text-white">
      <BackgroundGlow />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-violet-400">
              NexisAI Komuta Merkezi
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              İşletme Yönetim Sistemi
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Kayıtlı kullanıcılar, GEO kampanya geçmişi, LLM hedef soruları ve
              ödeme dökümlerini tek panelden izleyin.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-full border border-white/10 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-300 transition hover:border-violet-500/30 hover:text-white"
            >
              Operasyon Paneli
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-cyan-200">
              <Users className="h-4 w-4" />
              {businesses.length} kayıt
            </div>
          </div>
        </div>

        {loading ? (
          <div className="glass-card flex min-h-[320px] items-center justify-center p-10">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          </div>
        ) : error ? (
          <div className="glass-card flex min-h-[320px] flex-col items-center justify-center gap-3 p-10 text-center">
            <ShieldAlert className="h-10 w-10 text-rose-400" />
            <p className="text-lg font-semibold text-white">Erişim engellendi</p>
            <p className="max-w-lg text-sm text-zinc-400">{error}</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden border border-violet-500/15">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-white/5 bg-zinc-950/70 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  <tr>
                    <th className="px-5 py-4">Kayıt Tarihi</th>
                    <th className="px-5 py-4">İşletme Adı</th>
                    <th className="px-5 py-4">Sektör</th>
                    <th className="px-5 py-4">E-posta</th>
                    <th className="px-5 py-4">Toplam Ödeme</th>
                    <th className="px-5 py-4">Kampanya</th>
                    <th className="px-5 py-4" />
                  </tr>
                </thead>
                <tbody>
                  {businesses.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-16 text-center text-zinc-500"
                      >
                        Henüz kayıtlı işletme bulunmuyor.
                      </td>
                    </tr>
                  ) : (
                    businesses.map((business) => (
                      <tr
                        key={business.userId}
                        className="border-b border-white/5 transition hover:bg-violet-500/5"
                      >
                        <td className="px-5 py-4 text-zinc-300">
                          {formatDate(business.registeredAt)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 shrink-0 text-violet-400" />
                            <span className="font-medium text-white">
                              {business.companyName}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-zinc-300">
                          {business.sectorLabel}
                        </td>
                        <td className="px-5 py-4 text-zinc-400">
                          {business.email}
                        </td>
                        <td className="px-5 py-4 font-semibold text-emerald-300">
                          {formatMoney(
                            business.totalPaymentAmount,
                            business.currency,
                          )}
                        </td>
                        <td className="px-5 py-4 text-zinc-300">
                          {business.campaignCount}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedUserId(business.userId)}
                            className="inline-flex items-center gap-1 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200 transition hover:border-violet-400/50 hover:bg-violet-500/20"
                          >
                            Detayları Gör
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <BusinessDetailModal
        userId={selectedUserId}
        accessToken={accessToken}
        onClose={() => setSelectedUserId(null)}
      />
    </div>
  );
}
