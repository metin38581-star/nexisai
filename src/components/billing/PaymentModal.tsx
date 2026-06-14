"use client";

import { useState } from "react";
import { SUBSCRIPTION_PLANS } from "@/lib/billing";
import type { SubscriptionPlanId } from "@/types/user";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (planId: SubscriptionPlanId) => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanId>("buyuyen");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const activePlan = SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlan);

  const handlePayment = async () => {
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    onPaymentSuccess(selectedPlan);
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/5 bg-zinc-950/90 shadow-neon backdrop-blur-2xl">
        <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-blue-600/15 blur-3xl" />

        <div className="relative border-b border-white/5 px-8 py-6">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-6 top-6 text-sm text-zinc-500 transition-colors hover:text-white"
          >
            İptal Et
          </button>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-400">
            Abonelik
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            Paketlerinizi Seçin
          </h2>
          <p className="mt-2 text-sm text-muted">
            Yapay zeka reklam motorunu aktifleştirmek için size uygun paketi
            seçin. Tüm ödemeler güvenli altyapı üzerinden işlenir.
          </p>
        </div>

        <div className="relative grid gap-4 p-8 md:grid-cols-2">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
                className={`group relative rounded-2xl border p-6 text-left transition-all duration-300 ${
                  isSelected
                    ? "border-violet-500/40 bg-violet-500/10 shadow-[0_0_30px_rgba(124,58,237,0.15)]"
                    : "border-white/5 bg-zinc-900/40 hover:border-white/10 hover:bg-zinc-900/60"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 right-4 rounded-full bg-neon-gradient px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                    Önerilen
                  </span>
                )}
                <p className="text-lg font-semibold text-white">{plan.name}</p>
                <p className="mt-1 text-sm text-muted">{plan.description}</p>
                <p className="mt-4 text-3xl font-bold text-white">
                  {plan.price.toLocaleString("tr-TR")}{" "}
                  <span className="text-base font-normal text-zinc-500">₺ / ay</span>
                </p>
                <ul className="mt-5 space-y-2">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-zinc-400"
                    >
                      <span className="mt-0.5 text-emerald-400">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <div
                  className={`mt-5 h-1 rounded-full transition-all ${
                    isSelected
                      ? "bg-gradient-to-r from-violet-500 to-blue-500"
                      : "bg-zinc-800 group-hover:bg-zinc-700"
                  }`}
                />
              </button>
            );
          })}
        </div>

        <div className="relative border-t border-white/5 px-8 py-6">
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="text-zinc-500">Seçilen Paket</span>
            <span className="font-medium text-white">
              {activePlan?.name} — {activePlan?.price.toLocaleString("tr-TR")} ₺
            </span>
          </div>
          <div className="mb-5 flex items-center gap-2 text-xs text-zinc-500">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-emerald-400" aria-hidden>
              <path
                d="M12 2l3 7h7l-5.5 4.5 2 7L12 17l-6.5 3.5 2-7L2 9h7l3-7z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            256-bit şifreleme ile korunan güvenli ödeme altyapısı
          </div>
          <button
            type="button"
            onClick={handlePayment}
            disabled={isProcessing}
            className="group relative w-full overflow-hidden rounded-xl py-4 text-base font-semibold text-white transition-all disabled:opacity-60"
          >
            <span className="absolute inset-0 bg-neon-gradient opacity-90 transition-opacity duration-500 group-hover:opacity-100" />
            <span className="absolute inset-0 bg-neon-gradient opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-60" />
            <span className="absolute inset-[1px] rounded-[11px] bg-zinc-950/20 backdrop-blur-sm" />
            <span className="relative">
              {isProcessing ? "Ödeme İşleniyor..." : "Güvenli Ödeme Yap"}
            </span>
          </button>
          <p className="mt-3 text-center text-xs text-zinc-600">
            Fatura bilgileriniz ödeme sonrası e-posta adresinize gönderilir.
          </p>
        </div>
      </div>
    </div>
  );
}
