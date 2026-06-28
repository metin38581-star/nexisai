"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Receipt,
  Sparkles,
  X,
} from "lucide-react";

import type { AdminBusinessDetail } from "@/types/admin";
import { buildAuthFetchInit } from "@/lib/auth-headers";
import CampaignContentInventory from "@/components/admin/CampaignContentInventory";

interface BusinessDetailModalProps {
  userId: string | null;
  accessToken: string | null;
  onClose: () => void;
}

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

function statusBadgeClass(status: string): string {
  const normalized = status.toLowerCase();
  if (["success", "succeeded", "paid"].includes(normalized)) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }
  if (["failed", "error", "declined"].includes(normalized)) {
    return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-300";
}

export default function BusinessDetailModal({
  userId,
  accessToken,
  onClose,
}: BusinessDetailModalProps) {
  const [detail, setDetail] = useState<AdminBusinessDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setDetail(null);
      setError(null);
      return;
    }

    let cancelled = false;

    const loadDetail = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/businesses/${userId}`, {
          credentials: "include",
          ...(accessToken ? buildAuthFetchInit(accessToken) : {}),
        });
        const payload = (await response.json()) as {
          success?: boolean;
          error?: string;
          business?: AdminBusinessDetail;
        };

        if (cancelled) {
          return;
        }

        if (!response.ok || !payload.business) {
          setError(payload.error ?? "Detay yüklenemedi.");
          setDetail(null);
          return;
        }

        setDetail(payload.business);
      } catch {
        if (!cancelled) {
          setError("Bağlantı hatası.");
          setDetail(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [accessToken, userId]);

  if (!userId) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="glass-card flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden border border-violet-500/20 shadow-[0_0_60px_rgba(124,58,237,0.15)]">
        <div className="flex items-start justify-between gap-4 border-b border-white/5 px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-400">
              İşletme Detay Kaydı
            </p>
            <h2 className="mt-1 text-2xl font-bold text-white">
              {detail?.companyName ?? "Yükleniyor..."}
            </h2>
            {detail ? (
              <p className="mt-1 text-sm text-zinc-400">
                {detail.email} · {detail.sectorLabel} · Kayıt:{" "}
                {formatDate(detail.registeredAt)}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 p-2 text-zinc-400 transition hover:border-white/20 hover:text-white"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-6 text-sm text-rose-200">
              {error}
            </div>
          ) : detail ? (
            <div className="space-y-8">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-400">
                    Toplam Ödeme
                  </p>
                  <p className="mt-1 text-xl font-bold text-emerald-300">
                    {formatMoney(detail.totalPaymentAmount, detail.currency)}
                  </p>
                </div>
                <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-violet-400">
                    Kampanya Sayısı
                  </p>
                  <p className="mt-1 text-xl font-bold text-violet-200">
                    {detail.campaigns.length}
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-cyan-400">
                    Ödeme Kaydı
                  </p>
                  <p className="mt-1 text-xl font-bold text-cyan-200">
                    {detail.payments.length}
                  </p>
                </div>
              </div>

              <section>
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-400" />
                  <h3 className="text-lg font-semibold text-white">
                    Kampanya İçerik Envanteri
                  </h3>
                </div>

                {detail.campaigns.length === 0 ? (
                  <p className="rounded-xl border border-white/5 bg-zinc-950/50 px-4 py-6 text-sm text-zinc-500">
                    Bu işletme için henüz kampanya kaydı yok.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {detail.campaigns.map((campaign) => (
                      <article
                        key={campaign.id}
                        className="overflow-hidden rounded-xl border border-violet-500/15 bg-zinc-950/50"
                      >
                        <div className="border-b border-white/5 px-4 py-3 sm:px-5">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {campaign.markaAdi} · {campaign.sehir}
                              </p>
                              <p className="mt-0.5 text-xs text-zinc-500">
                                {formatDate(campaign.createdAt)} ·{" "}
                                {campaign.sectorLabel} · Skor %{campaign.skor} ·{" "}
                                {formatMoney(campaign.totalCost, detail.currency)}
                              </p>
                            </div>
                            <span className="inline-flex w-fit rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-200">
                              {campaign.agresiflik}
                            </span>
                          </div>
                        </div>

                        <CampaignContentInventory
                          rows={campaign.contentInventory}
                          publicationSummary={campaign.publicationSummary}
                        />
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <div className="mb-4 flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-white">
                    Ödeme Geçmişi
                  </h3>
                </div>

                {detail.payments.length === 0 ? (
                  <p className="rounded-xl border border-white/5 bg-zinc-950/50 px-4 py-6 text-sm text-zinc-500">
                    Kayıtlı ödeme bulunamadı. Eski kampanyalar için maliyet
                    kampanya bütçesinden türetilmiş olabilir.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-white/5">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-white/5 bg-zinc-950/70 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                        <tr>
                          <th className="px-4 py-3">Tarih</th>
                          <th className="px-4 py-3">Tutar</th>
                          <th className="px-4 py-3">Sağlayıcı</th>
                          <th className="px-4 py-3">Durum</th>
                          <th className="px-4 py-3">Kod</th>
                          <th className="px-4 py-3">Açıklama</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.payments.map((payment) => (
                          <tr
                            key={payment.id}
                            className="border-b border-white/5 last:border-0"
                          >
                            <td className="px-4 py-3 text-zinc-300">
                              {formatDate(payment.createdAt)}
                            </td>
                            <td className="px-4 py-3 font-semibold text-emerald-300">
                              {formatMoney(payment.amount, payment.currency)}
                            </td>
                            <td className="px-4 py-3 capitalize text-zinc-400">
                              {payment.provider}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClass(payment.status)}`}
                              >
                                {payment.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                              {payment.providerStatusCode ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-zinc-400">
                              {payment.description ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
