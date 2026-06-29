"use client";

import { useMemo } from "react";
import { CreditCard, Lock, Receipt } from "lucide-react";

import {
  calculateCampaignPackageTotal,
  formatCampaignCurrency,
  MIN_CAMPAIGN_DAILY_BUDGET,
  MIN_CAMPAIGN_DAYS,
} from "@/lib/campaign-form-utils";
import "@/components/campaign/budget-operation-tier.css";

interface CampaignPaymentSummaryCardProps {
  dailyBudget: number;
  campaignDays: number;
  className?: string;
}

export default function CampaignPaymentSummaryCard({
  dailyBudget,
  campaignDays,
  className = "",
}: CampaignPaymentSummaryCardProps) {
  const isVisible =
    dailyBudget >= MIN_CAMPAIGN_DAILY_BUDGET &&
    campaignDays >= MIN_CAMPAIGN_DAYS;

  const totalAmount = useMemo(
    () => calculateCampaignPackageTotal(dailyBudget, campaignDays),
    [dailyBudget, campaignDays],
  );

  if (!isVisible) {
    return null;
  }

  return (
    <aside
      className={`campaign-payment-summary ${className}`.trim()}
      aria-live="polite"
      aria-label="Ödeme özeti"
    >
      <div className="campaign-payment-summary__glow" aria-hidden />

      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-zinc-950/95 via-zinc-900/90 to-emerald-950/20 p-5 shadow-[0_0_40px_rgba(16,185,129,0.08)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
              Ödeme Özeti
            </p>
            <h3 className="mt-1 text-base font-semibold text-white">
              Kampanya Paketi
            </h3>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
            <Receipt className="h-5 w-5 text-emerald-300" />
          </div>
        </div>

        <dl className="space-y-3 border-b border-zinc-800/80 pb-4">
          <div className="flex items-center justify-between gap-4 text-sm">
            <dt className="text-zinc-400">Kampanya Süresi</dt>
            <dd className="font-medium text-zinc-100">{campaignDays} Gün</dd>
          </div>
          <div className="flex items-center justify-between gap-4 text-sm">
            <dt className="text-zinc-400">Günlük Bütçe</dt>
            <dd className="font-medium text-zinc-100">
              {formatCampaignCurrency(dailyBudget)}
            </dd>
          </div>
        </dl>

        <div className="mt-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Toplam Ödenecek Tutar
          </p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-emerald-300 sm:text-4xl">
            {formatCampaignCurrency(totalAmount)}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            {formatCampaignCurrency(dailyBudget)} × {campaignDays} gün — tek
            seferde iyzico güvenli ödeme ekranında tahsil edilir.
          </p>
        </div>

        <ul className="mt-4 space-y-2 border-t border-zinc-800/80 pt-4 text-[11px] text-zinc-500">
          <li className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 shrink-0 text-emerald-400/80" />
            256-bit SSL · iyzico Checkout Form
          </li>
          <li className="flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5 shrink-0 text-emerald-400/80" />
            Taksit seçenekleri iyzico ekranında sunulur
          </li>
        </ul>
      </div>
    </aside>
  );
}
