"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CreditCard, Loader2, Sparkles } from "lucide-react";

import type { CampaignFormData, BusinessSector } from "@/types/campaign";
import { SECTOR_OPTIONS, TURKEY_CITY_OPTIONS } from "@/lib/constants";
import type { TurkishCitySlug } from "@/lib/turkey-cities";
import {
  CAMPAIGN_SELECT_PLACEHOLDER,
  CAMPAIGN_BUSINESS_NAME_PLACEHOLDER,
  MIN_CAMPAIGN_DAILY_BUDGET,
  MAX_CAMPAIGN_DAILY_BUDGET,
  CAMPAIGN_BUDGET_STEP,
  MIN_CAMPAIGN_DAYS,
  MAX_CAMPAIGN_DAYS,
  DEFAULT_CAMPAIGN_DAYS,
  clampCampaignDailyBudget,
  clampCampaignDays,
  calculateCampaignPackageTotal,
  formatCampaignCurrency,
} from "@/lib/campaign-form-utils";
import { isCoreQuestionSectorSupported } from "@/lib/core-questions";
import CyberBudgetField from "@/components/campaign/CyberBudgetField";
import CampaignPaymentSummaryCard from "@/components/campaign/CampaignPaymentSummaryCard";
import AutopilotVisibilityForecastPanel from "@/components/campaign/AutopilotVisibilityForecastPanel";
import CyberScanField from "@/components/campaign/CyberScanField";

interface CampaignCreationStudioProps {
  onSubmit: (data: CampaignFormData) => void;
  isLoading: boolean;
  draftForm?: CampaignFormData | null;
  onDraftApplied?: () => void;
}

const initialForm: CampaignFormData = {
  businessName: "",
  businessWebsite: "",
  sector: "",
  city: "",
  dailyBudget: MIN_CAMPAIGN_DAILY_BUDGET,
  campaignDays: DEFAULT_CAMPAIGN_DAYS,
  selectedQuestionIds: [],
};

const inputClass = "dc-cyber-input";

export default function CampaignCreationStudio({
  onSubmit,
  isLoading,
  draftForm = null,
  onDraftApplied,
}: CampaignCreationStudioProps) {
  const [form, setForm] = useState<CampaignFormData>(initialForm);
  const [budgetPreview, setBudgetPreview] = useState(MIN_CAMPAIGN_DAILY_BUDGET);
  const [daysPreview, setDaysPreview] = useState(DEFAULT_CAMPAIGN_DAYS);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const lastAppliedDraftRef = useRef<string | null>(null);

  const isSubmitLocked = submitting || isLoading;

  useEffect(() => {
    if (!isLoading) {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [isLoading]);

  useEffect(() => {
    if (!draftForm) {
      return;
    }

    const draftKey = JSON.stringify(draftForm);
    if (lastAppliedDraftRef.current === draftKey) {
      return;
    }

    lastAppliedDraftRef.current = draftKey;
    setForm({
      ...draftForm,
      campaignDays: clampCampaignDays(draftForm.campaignDays),
      selectedQuestionIds: [],
    });
    setBudgetPreview(draftForm.dailyBudget);
    setDaysPreview(clampCampaignDays(draftForm.campaignDays));
    onDraftApplied?.();
  }, [draftForm, onDraftApplied]);

  useEffect(() => {
    setBudgetPreview(form.dailyBudget);
  }, [form.dailyBudget]);

  useEffect(() => {
    setDaysPreview(form.campaignDays);
  }, [form.campaignDays]);

  const packageTotal = useMemo(
    () => calculateCampaignPackageTotal(budgetPreview, daysPreview),
    [budgetPreview, daysPreview],
  );

  const isFormReadyToSubmit =
    form.businessName.trim().length > 0 &&
    form.sector.length > 0 &&
    form.city.length > 0 &&
    form.dailyBudget >= MIN_CAMPAIGN_DAILY_BUDGET &&
    form.dailyBudget <= MAX_CAMPAIGN_DAILY_BUDGET &&
    form.campaignDays >= MIN_CAMPAIGN_DAYS &&
    form.campaignDays <= MAX_CAMPAIGN_DAYS &&
    isCoreQuestionSectorSupported(form.sector);

  const submitButtonLabel = isFormReadyToSubmit
    ? `Ödemeye Geç — ${formatCampaignCurrency(packageTotal)}`
    : "Kampanya Bilgilerini Tamamlayın";

  const updateField = <K extends keyof CampaignFormData>(
    key: K,
    value: CampaignFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (isSubmitLocked || submittingRef.current) {
      return;
    }

    if (!isCoreQuestionSectorSupported(form.sector)) {
      setFormError("Seçilen sektör için otopilot optimizasyon henüz aktif değil.");
      return;
    }

    if (!isFormReadyToSubmit) {
      setFormError("İşletme adı, sektör, şehir, bütçe ve operasyon süresini tamamlayın.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    onSubmit({
      businessName: form.businessName.trim(),
      businessWebsite: form.businessWebsite?.trim() || undefined,
      sector: form.sector,
      city: form.city,
      dailyBudget: clampCampaignDailyBudget(form.dailyBudget),
      campaignDays: clampCampaignDays(form.campaignDays),
      selectedQuestionIds: [],
    });
  };

  return (
    <div className="overflow-hidden">
      <div className="mb-6">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-200">
          <Sparkles className="h-3.5 w-3.5" />
          NexisAI Otopilot Kampanya Motoru
        </div>
        <h2 className="text-lg font-semibold text-white sm:text-xl">
          GEO Kampanya Oluşturma Odası
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Bütçenizi ve operasyon sürenizi belirleyin. Soru seçimi, içerik
          dağıtımı ve yayın takvimi tamamen otopilot modda arka planda
          yürütülür.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <CyberScanField label="İşletme / Marka Adı">
            <input
              type="text"
              required
              placeholder={CAMPAIGN_BUSINESS_NAME_PLACEHOLDER}
              value={form.businessName}
              onChange={(e) => updateField("businessName", e.target.value)}
              className={inputClass}
            />
          </CyberScanField>

          <CyberScanField label="İşletme Web Sitesi (Opsiyonel)">
            <input
              type="text"
              placeholder="Örn: www.nexisai.com"
              value={form.businessWebsite ?? ""}
              onChange={(e) => updateField("businessWebsite", e.target.value)}
              className={inputClass}
            />
          </CyberScanField>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <CyberScanField label="Sektör">
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
          </CyberScanField>

          <CyberScanField label="Şehir">
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
          </CyberScanField>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CyberBudgetField
            label="Günlük Operasyon Bütçesi (TL)"
            value={form.dailyBudget}
            min={MIN_CAMPAIGN_DAILY_BUDGET}
            max={MAX_CAMPAIGN_DAILY_BUDGET}
            step={CAMPAIGN_BUDGET_STEP}
            suffix="₺"
            clampMode="blur"
            onDraftChange={setBudgetPreview}
            onChange={(value) => updateField("dailyBudget", value)}
            showAgresiflik
          />
          <CyberBudgetField
            label="Operasyon Süresi (Gün)"
            value={form.campaignDays}
            min={MIN_CAMPAIGN_DAYS}
            max={MAX_CAMPAIGN_DAYS}
            step={1}
            prefix=""
            suffix="gün"
            onDraftChange={setDaysPreview}
            onChange={(value) =>
              updateField("campaignDays", clampCampaignDays(value))
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] xl:items-start">
          <CampaignPaymentSummaryCard
            className="order-1 xl:order-2 xl:sticky xl:top-6"
            dailyBudget={budgetPreview}
            campaignDays={daysPreview}
          />

          <div className="order-2 min-w-0 xl:order-1">
            <AutopilotVisibilityForecastPanel
              dailyBudget={budgetPreview}
              campaignDays={daysPreview}
            />
          </div>
        </div>

        {formError ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {formError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting || isLoading || !isFormReadyToSubmit}
          aria-busy={submitting || isLoading}
          className="group relative w-full min-h-[48px] overflow-hidden rounded-xl py-4 text-base font-semibold text-white transition-all duration-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="absolute inset-0 bg-neon-gradient opacity-90 transition-opacity duration-500 group-hover:opacity-100" />
          <span className="absolute inset-[1px] rounded-[11px] bg-zinc-950/20 backdrop-blur-sm" />
          <span className="relative inline-flex items-center justify-center gap-2">
            {isSubmitLocked ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Ödeme Sayfasına Yönlendiriliyor...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                {submitButtonLabel}
              </>
            )}
          </span>
        </button>
      </form>
    </div>
  );
}
