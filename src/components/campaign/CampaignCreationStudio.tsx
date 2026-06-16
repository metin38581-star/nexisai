"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Radar,
  Rocket,
  Sparkles,
  Target,
} from "lucide-react";

import type { CampaignFormData, BusinessSector } from "@/types/campaign";
import type { GeoMicroIntent } from "@/types/geo-intent";
import {
  SECTOR_OPTIONS,
  TURKEY_CITY_OPTIONS,
} from "@/lib/constants";
import type { TurkishCitySlug } from "@/lib/turkey-cities";
import {
  CAMPAIGN_SELECT_PLACEHOLDER,
  CAMPAIGN_BUSINESS_NAME_PLACEHOLDER,
  isCampaignFormReadyForScan,
} from "@/lib/campaign-form-utils";
import {
  INTENT_UNLOCK_BUDGET_COST,
  resolveIntentSoftCap,
  resolveSoftCapAfterBudgetIncrease,
} from "@/lib/intent-soft-cap";
import { resolveContentVolumePlan } from "@/lib/content-volume";
import { buildAuthFetchInit } from "@/lib/auth-headers";
import CyberBudgetField from "@/components/campaign/CyberBudgetField";
import IntentQuestionGrid from "@/components/campaign/IntentQuestionGrid";
import IntentSoftCapModal from "@/components/campaign/IntentSoftCapModal";
import LiveLlmVisibilitySimulator from "@/components/campaign/LiveLlmVisibilitySimulator";
import WalletTopUpModal from "@/components/campaign/WalletTopUpModal";

interface CampaignCreationStudioProps {
  onSubmit: (data: CampaignFormData) => void;
  isLoading: boolean;
  accessToken: string | null;
  walletRefreshToken?: number;
  onWalletRefresh?: () => void;
}

const initialForm: CampaignFormData = {
  businessName: "",
  sector: "",
  city: "",
  dailyBudget: 0,
  campaignDays: 7,
  bonusIntentUnlocks: 0,
};

const inputClass =
  "w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-white placeholder:text-zinc-600 transition-colors duration-200 focus:border-violet-500/40 focus:outline-none focus:ring-1 focus:ring-violet-500/20";

export default function CampaignCreationStudio({
  onSubmit,
  isLoading,
  accessToken,
  walletRefreshToken = 0,
  onWalletRefresh,
}: CampaignCreationStudioProps) {
  const [form, setForm] = useState<CampaignFormData>(initialForm);
  const [intents, setIntents] = useState<GeoMicroIntent[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewIntent, setPreviewIntent] = useState<GeoMicroIntent | null>(
    null,
  );
  const [walletBalance, setWalletBalance] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [analysisSource, setAnalysisSource] = useState<"cache" | "gemini" | null>(
    null,
  );
  const [softCapModalOpen, setSoftCapModalOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<GeoMicroIntent | null>(
    null,
  );
  const [isUnlocking, setIsUnlocking] = useState(false);

  const canScanIntents = isCampaignFormReadyForScan(form);

  const sektorLabel =
    SECTOR_OPTIONS.find((option) => option.value === form.sector)?.label ??
    form.sector;
  const sehirLabel =
    TURKEY_CITY_OPTIONS.find((option) => option.value === form.city)?.label ??
    form.city;

  const contentVolumePlan = useMemo(
    () => resolveContentVolumePlan(form.dailyBudget, selectedIds.size),
    [form.dailyBudget, selectedIds.size],
  );

  const softCapResult = useMemo(
    () =>
      resolveIntentSoftCap({
        dailyBudget: form.dailyBudget,
        bonusUnlocks: form.bonusIntentUnlocks ?? 0,
      }),
    [form.dailyBudget, form.bonusIntentUnlocks],
  );

  const nextSoftCapAfterUnlock = useMemo(
    () =>
      resolveSoftCapAfterBudgetIncrease(
        form.dailyBudget,
        INTENT_UNLOCK_BUDGET_COST,
      ),
    [form.dailyBudget],
  );

  const fetchWalletBalance = useCallback(async () => {
    try {
      const response = await fetch("/api/wallet");
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as { balance: number };
      setWalletBalance(data.balance);
    } catch {
      // Sessiz devam.
    }
  }, []);

  useEffect(() => {
    void fetchWalletBalance();
  }, [fetchWalletBalance, walletRefreshToken]);

  const scanIntents = useCallback(async () => {
    if (!canScanIntents) {
      setScanError(
        "İşletme adı, sektör, şehir ve günlük bütçe alanlarını doldurun.",
      );
      return;
    }

    setIsScanning(true);
    setScanError(null);

    try {
      const response = await fetch(
        "/api/campaign/analyze",
        buildAuthFetchInit(accessToken, {
          method: "POST",
          body: JSON.stringify({
            sehir: sehirLabel,
            sektor: sektorLabel,
            markaAdi: form.businessName.trim(),
            gunlukButce: form.dailyBudget,
          }),
        }),
      );

      const result = await response.json();

      if (!response.ok) {
        setScanError(result.error ?? "Pazar istihbarat motoru yanıt vermedi.");
        return;
      }

      const nextIntents = (result.intents ?? []) as GeoMicroIntent[];
      setAnalysisSource(result.cached ? "cache" : "gemini");
      setIntents(nextIntents);
      setSelectedIds(new Set());
      setPreviewIntent(nextIntents[0] ?? null);
    } catch {
      setScanError("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setIsScanning(false);
    }
  }, [accessToken, canScanIntents, form.businessName, form.dailyBudget, sehirLabel, sektorLabel]);

  useEffect(() => {
    if (!canScanIntents) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void scanIntents();
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [form.city, form.sector, form.businessName, form.dailyBudget, scanIntents, canScanIntents]);

  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size <= softCapResult.softCap) {
        return prev;
      }

      return new Set([...prev].slice(0, softCapResult.softCap));
    });
  }, [softCapResult.softCap]);

  const updateField = <K extends keyof CampaignFormData>(
    key: K,
    value: CampaignFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleIntent = (intent: GeoMicroIntent) => {
    setPreviewIntent(intent);

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(intent.id)) {
        next.delete(intent.id);
        return next;
      }

      if (next.size >= softCapResult.softCap) {
        setPendingIntent(intent);
        setSoftCapModalOpen(true);
        return prev;
      }

      next.add(intent.id);
      return next;
    });
  };

  const handleUnlockConfirm = async () => {
    setIsUnlocking(true);

    try {
      if (walletBalance < INTENT_UNLOCK_BUDGET_COST) {
        setSoftCapModalOpen(false);
        setWalletModalOpen(true);
        return;
      }

      const response = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: INTENT_UNLOCK_BUDGET_COST,
          operation: "deduct",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setSoftCapModalOpen(false);
        setWalletModalOpen(true);
        return;
      }

      setWalletBalance(result.balance as number);
      updateField("dailyBudget", form.dailyBudget + INTENT_UNLOCK_BUDGET_COST);
      updateField(
        "bonusIntentUnlocks",
        (form.bonusIntentUnlocks ?? 0) + 1,
      );

      if (pendingIntent) {
        setSelectedIds((prev) => new Set(prev).add(pendingIntent.id));
        setPreviewIntent(pendingIntent);
        setPendingIntent(null);
      }

      setSoftCapModalOpen(false);
      onWalletRefresh?.();
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (selectedIds.size === 0) {
      setScanError("En az bir arama hedefi seçmelisiniz.");
      return;
    }

    const selectedItems = intents.filter((intent) =>
      selectedIds.has(intent.id),
    );

    const selectedQuestions = selectedItems.map((intent) =>
      intent.question.trim(),
    );
    const selectedAnswers = selectedItems.map((intent) =>
      intent.simulatedAnswer.trim(),
    );

    onSubmit({
      ...form,
      selectedQuestions,
      selectedAnswers,
      selectedIntents: selectedItems,
    });
  };

  return (
    <>
      <div className="glass-card overflow-hidden p-6 lg:p-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-200">
              <Sparkles className="h-3.5 w-3.5" />
              Canlı Pazar İstihbarat Motoru
            </div>
            <h2 className="text-xl font-semibold text-white">
              GEO Kampanya Oluşturma Odası
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
              Popüler kullanıcı sorgularını seçin; sağ panelde canlı LLM
              simülasyonu anında başlasın.
            </p>
            {analysisSource === "cache" ? (
              <p className="mt-2 text-xs font-medium text-emerald-400">
                ⚡ Önbellekten yüklendi — sıfır Gemini maliyeti
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 px-3 py-2 text-right">
              <p className="text-[10px] uppercase tracking-wider text-cyan-400">
                İçerik Hacmi
              </p>
              <p className="text-sm font-semibold text-white">
                {selectedIds.size > 0
                  ? `${selectedIds.size} bağımsız makale`
                  : `${contentVolumePlan.maxSelectable} soruya kadar`}
              </p>
              <p className="mt-1 max-w-[220px] text-[10px] leading-relaxed text-zinc-500">
                {contentVolumePlan.description}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-right">
              <p className="text-[10px] uppercase tracking-wider text-emerald-400">
                {softCapResult.tierLabel}
              </p>
              <p className="text-sm font-semibold text-white">
                Seçim: {selectedIds.size}/{softCapResult.softCap}
              </p>
              <p className="mt-1 text-[10px] text-zinc-500">
                Günlük bütçe: ${form.dailyBudget || 0}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FormField label="İşletme / Marka Adı">
              <input
                type="text"
                required
                placeholder={CAMPAIGN_BUSINESS_NAME_PLACEHOLDER}
                value={form.businessName}
                onChange={(e) => updateField("businessName", e.target.value)}
                className={inputClass}
              />
            </FormField>

            <FormField label="Sektör">
              <select
                value={form.sector}
                onChange={(e) =>
                  updateField("sector", e.target.value as BusinessSector | "")
                }
                className={inputClass}
              >
                <option value="" disabled hidden>
                  {CAMPAIGN_SELECT_PLACEHOLDER}
                </option>
                {SECTOR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Şehir">
              <select
                value={form.city}
                onChange={(e) =>
                  updateField("city", e.target.value as TurkishCitySlug | "")
                }
                className={inputClass}
              >
                <option value="" disabled hidden>
                  {CAMPAIGN_SELECT_PLACEHOLDER}
                </option>
                {TURKEY_CITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void scanIntents()}
                disabled={isScanning || !canScanIntents}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isScanning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Radar className="h-4 w-4" />
                )}
                Niyetleri Tara
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <CyberBudgetField
                label="Günlük Operasyon Bütçesi ($)"
                value={form.dailyBudget}
                min={10}
                max={350}
                step={5}
                allowUnset
                onChange={(value) => updateField("dailyBudget", value)}
                showAgresiflik
              />
              {form.dailyBudget > 0 ? (
                <p className="mt-2 text-xs leading-relaxed text-violet-300/90">
                  {softCapResult.analysisDescription}
                </p>
              ) : null}
            </div>
            <CyberBudgetField
              label="Operasyon Süresi (Gün)"
              value={form.campaignDays}
              min={1}
              max={90}
              step={1}
              prefix=""
              suffix="gün"
              onChange={(value) => updateField("campaignDays", value)}
            />
          </div>

          {scanError ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {scanError}
            </p>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-5">
            <div className="xl:col-span-3">
              {isScanning && intents.length === 0 ? (
                <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/40">
                  <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-violet-400" />
                    <p className="mt-3 text-sm text-zinc-500">
                      Canlı pazar istihbaratı taranıyor...
                    </p>
                  </div>
                </div>
              ) : intents.length > 0 ? (
                <IntentQuestionGrid
                  intents={intents}
                  selectedIds={selectedIds}
                  softCap={softCapResult.softCap}
                  analysisDescription={softCapResult.analysisDescription}
                  previewId={previewIntent?.id ?? null}
                  onPreview={setPreviewIntent}
                  onToggle={toggleIntent}
                />
              ) : (
                <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/30 p-6 text-center text-sm text-zinc-500">
                  İşletme adı, sektör, şehir ve günlük bütçe girildiğinde{" "}
                  {softCapResult.maxQuestions} popüler kullanıcı sorgusu otomatik
                  üretilecek.
                  <span className="mt-2 block text-xs text-violet-300/80">
                    {softCapResult.analysisDescription}
                  </span>
                </div>
              )}
            </div>

            <div className="xl:col-span-2">
              <LiveLlmVisibilitySimulator
                intent={previewIntent}
                brandName={form.businessName.trim() || "Markanız"}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || selectedIds.size === 0}
            className="group relative mt-2 w-full overflow-hidden rounded-xl py-4 text-base font-semibold text-white transition-all duration-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="absolute inset-0 bg-neon-gradient opacity-90 transition-opacity duration-500 group-hover:opacity-100" />
            <span className="absolute inset-[1px] rounded-[11px] bg-zinc-950/20 backdrop-blur-sm" />
            <span className="relative inline-flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Kampanya Başlatılıyor...
                </>
              ) : (
                <>
                  <Rocket className="h-5 w-5" />
                  {selectedIds.size} Arama Hedefi ile GEO Kampanyasını Başlat
                  <Target className="h-5 w-5" />
                </>
              )}
            </span>
          </button>
        </form>
      </div>

      <IntentSoftCapModal
        isOpen={softCapModalOpen}
        currentCap={softCapResult.softCap}
        nextCap={nextSoftCapAfterUnlock}
        budgetIncrease={INTENT_UNLOCK_BUDGET_COST}
        onClose={() => {
          setSoftCapModalOpen(false);
          setPendingIntent(null);
        }}
        onConfirm={() => void handleUnlockConfirm()}
        isProcessing={isUnlocking}
      />

      <WalletTopUpModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        onSuccess={(balance) => {
          setWalletBalance(balance);
          onWalletRefresh?.();
        }}
      />
    </>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-zinc-300">
        {label}
      </label>
      {children}
    </div>
  );
}
