"use client";

import { useMemo, useState } from "react";
import { Cpu, Loader2, Rocket, Sparkles } from "lucide-react";

import type { CampaignFormData, BusinessSector } from "@/types/campaign";
import {
  SECTOR_OPTIONS,
  TURKEY_CITY_OPTIONS,
} from "@/lib/constants";
import type { TurkishCitySlug } from "@/lib/turkey-cities";
import {
  CAMPAIGN_SELECT_PLACEHOLDER,
  CAMPAIGN_BUSINESS_NAME_PLACEHOLDER,
} from "@/lib/campaign-form-utils";
import {
  resolveAutonomousCampaignButtonLabel,
  resolveIntentSoftCap,
} from "@/lib/intent-soft-cap";
import { resolveContentVolumePlan } from "@/lib/content-volume";
import CyberBudgetField from "@/components/campaign/CyberBudgetField";

interface CampaignCreationStudioProps {
  onSubmit: (data: CampaignFormData) => void;
  isLoading: boolean;
}

const initialForm: CampaignFormData = {
  businessName: "",
  sector: "",
  city: "",
  dailyBudget: 0,
  campaignDays: 7,
};

const inputClass =
  "w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-white placeholder:text-zinc-600 transition-colors duration-200 focus:border-violet-500/40 focus:outline-none focus:ring-1 focus:ring-violet-500/20";

export default function CampaignCreationStudio({
  onSubmit,
  isLoading,
}: CampaignCreationStudioProps) {
  const [form, setForm] = useState<CampaignFormData>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);

  const softCapResult = useMemo(
    () => resolveIntentSoftCap({ dailyBudget: form.dailyBudget }),
    [form.dailyBudget],
  );

  const contentVolumePlan = useMemo(
    () => resolveContentVolumePlan(form.dailyBudget),
    [form.dailyBudget],
  );

  const submitButtonLabel = useMemo(
    () =>
      form.dailyBudget >= 10
        ? resolveAutonomousCampaignButtonLabel(form.dailyBudget)
        : "Otonom Kampanyayı Başlat",
    [form.dailyBudget],
  );

  const updateField = <K extends keyof CampaignFormData>(
    key: K,
    value: CampaignFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const isFormReadyToSubmit =
    form.businessName.trim().length > 0 &&
    form.sector.length > 0 &&
    form.city.length > 0 &&
    form.dailyBudget >= 10 &&
    form.campaignDays >= 1;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!isFormReadyToSubmit) {
      setFormError(
        "İşletme adı, sektör, şehir ve günlük bütçe alanlarını doldurun.",
      );
      return;
    }

    onSubmit({
      businessName: form.businessName.trim(),
      sector: form.sector,
      city: form.city,
      dailyBudget: form.dailyBudget,
      campaignDays: form.campaignDays,
    });
  };

  return (
    <div className="glass-card overflow-hidden p-6 lg:p-8">
      <div className="mb-6">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-200">
          <Sparkles className="h-3.5 w-3.5" />
          Otonom GEO Kampanya Motoru
        </div>
        <h2 className="text-xl font-semibold text-white">
          GEO Kampanya Oluşturma Odası
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Bilgilerinizi girin ve başlatın. Hedef belirleme, makale üretimi ve
          yayın tamamen arka planda otomatik işler — seçim veya tıklama gerekmez.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
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
        </div>

        <div className="grid gap-4 md:grid-cols-2">
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

        <AutonomousAnalysisInfoCard
          dailyBudget={form.dailyBudget}
          tierLabel={softCapResult.tierLabel}
          targetCount={softCapResult.maxQuestions}
          analysisDescription={softCapResult.analysisDescription}
          contentDescription={contentVolumePlan.description}
        />

        {formError ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {formError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isLoading || !isFormReadyToSubmit}
          className="group relative w-full overflow-hidden rounded-xl py-4 text-base font-semibold text-white transition-all duration-500 disabled:cursor-not-allowed disabled:opacity-60"
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
                {submitButtonLabel}
              </>
            )}
          </span>
        </button>
      </form>
    </div>
  );
}

function AutonomousAnalysisInfoCard({
  dailyBudget,
  tierLabel,
  targetCount,
  analysisDescription,
  contentDescription,
}: {
  dailyBudget: number;
  tierLabel: string;
  targetCount: number;
  analysisDescription: string;
  contentDescription: string;
}) {
  return (
    <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 via-zinc-950/40 to-violet-500/5 p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10">
          <Cpu className="h-5 w-5 text-cyan-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
            Otonom Yapay Zeka Pazar Analizi
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            {dailyBudget >= 10
              ? analysisDescription
              : "Günlük bütçe girildiğinde analiz derinliği otomatik belirlenir."}
          </p>
          {dailyBudget >= 10 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                {tierLabel}
              </span>
              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold text-violet-200">
                {targetCount} otonom hedef
              </span>
              <span className="rounded-full border border-zinc-700 bg-zinc-900/60 px-3 py-1 text-[11px] text-zinc-400">
                {contentDescription}
              </span>
            </div>
          ) : null}
          <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">
            Hedef sorular arka planda belirlenir; liste veya seçim ekranı
            gösterilmez. Kampanya başladığında sistem sektörünüzdeki en kritik
            aramaları otomatik tespit eder ve makaleleri üretir.
          </p>
        </div>
      </div>
    </div>
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
