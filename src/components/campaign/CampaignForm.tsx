"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Cpu, Loader2, Rocket } from "lucide-react";

import type { CampaignFormData, BusinessSector } from "@/types/campaign";
import {
  SECTOR_OPTIONS,
  TURKEY_CITY_OPTIONS,
  CUSTOM_SECTOR_SLUG,
} from "@/lib/constants";
import { isCustomSectorSlug } from "@/lib/sector-utils";
import type { TurkishCitySlug } from "@/lib/turkey-cities";
import {
  CAMPAIGN_BUSINESS_NAME_PLACEHOLDER,
  CAMPAIGN_SELECT_PLACEHOLDER,
  MIN_CAMPAIGN_DAILY_BUDGET,
  MAX_CAMPAIGN_DAILY_BUDGET,
  CAMPAIGN_BUDGET_STEP,
  MIN_CAMPAIGN_DAYS,
  DEFAULT_CAMPAIGN_DAYS,
  clampCampaignDailyBudget,
  clampCampaignDays,
} from "@/lib/campaign-form-utils";
import {
  resolveAutonomousCampaignButtonLabel,
  resolveIntentSoftCap,
} from "@/lib/intent-soft-cap";
import { resolveContentVolumePlan } from "@/lib/content-volume";
import CyberBudgetField from "@/components/campaign/CyberBudgetField";

interface CampaignFormProps {
  onSubmit: (data: CampaignFormData) => void;
  isLoading: boolean;
}

const initialForm: CampaignFormData = {
  businessName: "",
  sector: "",
  customSector: "",
  city: "",
  dailyBudget: MIN_CAMPAIGN_DAILY_BUDGET,
  campaignDays: DEFAULT_CAMPAIGN_DAYS,
  selectedQuestionIds: [],
};

const inputClass =
  "w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-white placeholder:text-zinc-600 transition-colors duration-200 focus:border-violet-500/40 focus:outline-none focus:ring-1 focus:ring-violet-500/20";

export default function CampaignForm({
  onSubmit,
  isLoading,
}: CampaignFormProps) {
  const [form, setForm] = useState<CampaignFormData>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const isCustomSector = isCustomSectorSlug(form.sector);

  const isSubmitLocked = submitting || isLoading;

  useEffect(() => {
    if (!isLoading) {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [isLoading]);

  const softCapResult = useMemo(
    () => resolveIntentSoftCap({ dailyBudget: form.dailyBudget }),
    [form.dailyBudget],
  );

  const contentVolumePlan = useMemo(
    () => resolveContentVolumePlan(form.dailyBudget),
    [form.dailyBudget],
  );

  const submitButtonLabel = useMemo(
    () => resolveAutonomousCampaignButtonLabel(form.dailyBudget),
    [form.dailyBudget],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitLocked || submittingRef.current) {
      return;
    }

    if (isCustomSector && (form.customSector?.trim().length ?? 0) < 3) {
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    onSubmit({
      businessName: form.businessName.trim(),
      sector: form.sector,
      customSector: isCustomSector ? form.customSector?.trim() : undefined,
      city: form.city,
      dailyBudget: clampCampaignDailyBudget(form.dailyBudget),
      campaignDays: clampCampaignDays(form.campaignDays),
      selectedQuestionIds: [],
    });
  };

  const updateField = <K extends keyof CampaignFormData>(
    key: K,
    value: CampaignFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="glass-card p-6 lg:p-8">
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white">
          Otonom GEO Kampanya
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Bilgilerinizi girin; hedef belirleme ve makale üretimi tamamen arka
          planda otomatik işler.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
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

        <FormField label="İşletme Sektörü">
          <select
            value={form.sector}
            onChange={(e) => {
              const nextSector = e.target.value as BusinessSector | "";
              setForm((prev) => ({
                ...prev,
                sector: nextSector,
                customSector:
                  nextSector === CUSTOM_SECTOR_SLUG ? prev.customSector : "",
              }));
            }}
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

        {isCustomSector ? (
          <FormField label="Özel Sektör / Hizmet Adı">
            <input
              type="text"
              required
              placeholder="Örn: Balkon Filesi Montajı, Halı Yıkama, Pet Taksi"
              value={form.customSector ?? ""}
              onChange={(e) => updateField("customSector", e.target.value)}
              className={inputClass}
            />
          </FormField>
        ) : null}

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

        <CyberBudgetField
          label="Günlük Operasyon Bütçesi (TL)"
          value={form.dailyBudget}
          min={MIN_CAMPAIGN_DAILY_BUDGET}
          max={MAX_CAMPAIGN_DAILY_BUDGET}
          step={CAMPAIGN_BUDGET_STEP}
          suffix="₺"
          clampMode="blur"
          onChange={(value) => updateField("dailyBudget", value)}
          showAgresiflik
        />

        <CyberBudgetField
          label="Operasyon Süresi (Gün)"
          value={form.campaignDays}
          min={MIN_CAMPAIGN_DAYS}
          max={90}
          step={1}
          prefix=""
          suffix="gün"
          onChange={(value) =>
            updateField("campaignDays", clampCampaignDays(value))
          }
        />

        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <div className="flex items-start gap-3">
            <Cpu className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                Otonom Pazar Analizi
              </p>
              <p className="mt-1 text-sm text-zinc-300">
                {softCapResult.analysisDescription}
              </p>
              <p className="mt-2 text-[11px] text-zinc-500">
                {contentVolumePlan.description}
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || isLoading}
          aria-busy={submitting || isLoading}
          className="group relative mt-2 w-full overflow-hidden rounded-xl py-4 text-base font-semibold text-white transition-all duration-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="absolute inset-0 bg-neon-gradient opacity-90 transition-opacity duration-500 group-hover:opacity-100" />
          <span className="absolute inset-[1px] rounded-[11px] bg-zinc-950/20 backdrop-blur-sm" />
          <span className="relative flex items-center justify-center gap-2">
            {isSubmitLocked ? (
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
