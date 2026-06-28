"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Cpu, Loader2, Rocket, Sparkles } from "lucide-react";

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
  DEFAULT_CAMPAIGN_DAYS,
  clampCampaignDailyBudget,
  clampCampaignDays,
} from "@/lib/campaign-form-utils";
import {
  resolveCampaignLaunchButtonLabel,
  resolveIntentSoftCap,
} from "@/lib/intent-soft-cap";
import { resolveContentVolumePlan } from "@/lib/content-volume";
import CyberBudgetField from "@/components/campaign/CyberBudgetField";
import CyberScanField from "@/components/campaign/CyberScanField";
import CoreQuestionsPanel from "@/components/campaign/CoreQuestionsPanel";
import OrbitRingIcon from "@/components/campaign/OrbitRingIcon";
import { resolveBudgetOperationTier } from "@/lib/budget-operation-tiers";
import {
  getCoreQuestionPoolSize,
  isCoreQuestionSectorSupported,
  pickDefaultCoreQuestionIds,
  resolveMaxSelection,
  CORE_QUESTION_SUPPORTED_LABELS_TEXT,
} from "@/lib/core-questions";

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
  const poolSize = getCoreQuestionPoolSize(form.sector);
  const maxSelection = resolveMaxSelection(budgetPreview, form.sector);

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
    setForm(draftForm);
    setBudgetPreview(draftForm.dailyBudget);
    setDaysPreview(draftForm.campaignDays);
    onDraftApplied?.();
  }, [draftForm, onDraftApplied]);

  useEffect(() => {
    setBudgetPreview(form.dailyBudget);
  }, [form.dailyBudget]);

  useEffect(() => {
    setDaysPreview(form.campaignDays);
  }, [form.campaignDays]);

  const softCapResult = useMemo(
    () =>
      resolveIntentSoftCap({
        dailyBudget: budgetPreview,
        poolSize: poolSize || 15,
      }),
    [budgetPreview, poolSize],
  );

  const contentVolumePlan = useMemo(
    () => resolveContentVolumePlan(budgetPreview, poolSize || 15),
    [budgetPreview, poolSize],
  );

  const budgetTier = useMemo(
    () => resolveBudgetOperationTier(budgetPreview),
    [budgetPreview],
  );

  const submitButtonLabel = useMemo(
    () =>
      resolveCampaignLaunchButtonLabel(
        budgetPreview,
        form.selectedQuestionIds.length,
        maxSelection,
      ),
    [budgetPreview, form.selectedQuestionIds.length, maxSelection],
  );

  const updateField = <K extends keyof CampaignFormData>(
    key: K,
    value: CampaignFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelectionChange = useCallback((selectedQuestionIds: string[]) => {
    setForm((prev) => ({ ...prev, selectedQuestionIds }));
  }, []);

  useEffect(() => {
    if (!isCoreQuestionSectorSupported(form.sector)) {
      return;
    }

    setForm((prev) => {
      const nextMax = resolveMaxSelection(prev.dailyBudget, prev.sector);
      if (nextMax === 0) {
        return prev.selectedQuestionIds.length === 0
          ? prev
          : { ...prev, selectedQuestionIds: [] };
      }

      const trimmed = prev.selectedQuestionIds.slice(0, nextMax);
      if (trimmed.length > 0) {
        return trimmed.length === prev.selectedQuestionIds.length
          ? prev
          : { ...prev, selectedQuestionIds: trimmed };
      }

      const defaults = pickDefaultCoreQuestionIds(prev.sector, prev.dailyBudget);
      return defaults.length === prev.selectedQuestionIds.length &&
        defaults.every((id, index) => id === prev.selectedQuestionIds[index])
        ? prev
        : { ...prev, selectedQuestionIds: defaults };
    });
  }, [form.sector, form.dailyBudget]);

  const isFormReadyToSubmit =
    form.businessName.trim().length > 0 &&
    form.sector.length > 0 &&
    form.city.length > 0 &&
    form.dailyBudget >= MIN_CAMPAIGN_DAILY_BUDGET &&
    form.dailyBudget <= MAX_CAMPAIGN_DAILY_BUDGET &&
    form.campaignDays >= MIN_CAMPAIGN_DAYS &&
    isCoreQuestionSectorSupported(form.sector) &&
    form.selectedQuestionIds.length > 0 &&
    form.selectedQuestionIds.length <= maxSelection;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (isSubmitLocked || submittingRef.current) {
      return;
    }

    if (!isCoreQuestionSectorSupported(form.sector)) {
      setFormError(
        `Kemik soru havuzu yalnızca ${CORE_QUESTION_SUPPORTED_LABELS_TEXT} sektörlerinde kullanılabilir.`,
      );
      return;
    }

    if (form.selectedQuestionIds.length === 0) {
      setFormError("En az bir kemik soru seçmelisiniz.");
      return;
    }

    if (form.selectedQuestionIds.length > maxSelection) {
      setFormError(
        `Bütçeniz en fazla ${maxSelection} soru seçmenize izin veriyor.`,
      );
      return;
    }

    if (!isFormReadyToSubmit) {
      setFormError(
        "İşletme adı, sektör, şehir, bütçe ve soru seçimlerini tamamlayın.",
      );
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
      selectedQuestionIds: form.selectedQuestionIds,
    });
  };

  return (
    <div className="overflow-hidden">
      <div className="mb-6">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-200">
          <Sparkles className="h-3.5 w-3.5" />
          Kemik Soru Kampanya Motoru
        </div>
        <h2 className="text-lg font-semibold text-white sm:text-xl">
          GEO Kampanya Oluşturma Odası
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          15 kemik soru havuzundan hedeflerinizi seçin. Bütçe barını kaydırdıkça
          seçim limitiniz anında yükselir; onayladığınız sorular işletme adınızla
          birlikte yayın hattına gönderilir.
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

          <CyberScanField label="İşletme Web Sitesi">
            <input
              type="url"
              placeholder="ornek.com"
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
              onChange={(e) => {
                const nextSector = e.target.value as BusinessSector | "";
                setForm((prev) => ({
                  ...prev,
                  sector: nextSector,
                  selectedQuestionIds: [],
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
            max={90}
            step={1}
            prefix=""
            suffix="gün"
            onDraftChange={setDaysPreview}
            onChange={(value) =>
              updateField("campaignDays", clampCampaignDays(value))
            }
          />
        </div>

        <CoreQuestionsPanel
          sector={form.sector}
          city={form.city}
          dailyBudget={budgetPreview}
          selectedIds={form.selectedQuestionIds}
          onSelectionChange={handleSelectionChange}
        />

        <CampaignBudgetInfoCard
          tier={budgetTier}
          tierLabel={softCapResult.tierLabel}
          targetCount={softCapResult.maxQuestions}
          selectedCount={form.selectedQuestionIds.length}
          analysisDescription={softCapResult.analysisDescription}
          contentDescription={contentVolumePlan.description}
          previewDays={daysPreview}
        />

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

function CampaignBudgetInfoCard({
  tier,
  tierLabel,
  targetCount,
  selectedCount,
  analysisDescription,
  contentDescription,
  previewDays,
}: {
  tier: ReturnType<typeof resolveBudgetOperationTier>;
  tierLabel: string;
  targetCount: number;
  selectedCount: number;
  analysisDescription: string;
  contentDescription: string;
  previewDays: number;
}) {
  const cardThemeClass = `bot-analysis-card bot-analysis-card--${tier.neonTheme}`;

  return (
    <div className={cardThemeClass}>
      <div className="flex items-start gap-4">
        <OrbitRingIcon className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10">
          <Cpu className="h-5 w-5 text-cyan-300" />
        </OrbitRingIcon>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
            Dinamik Bütçe & Soru Limiti
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            {analysisDescription}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-200">
              {tierLabel}
            </span>
            <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold text-violet-200">
              {selectedCount}/{targetCount} soru seçildi
            </span>
            <span className="rounded-full border border-zinc-700 bg-zinc-900/60 px-3 py-1 text-[11px] text-zinc-400">
              {contentDescription}
            </span>
            <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold text-cyan-200">
              Radar: {tier.radarSikligi}
            </span>
            <span className="rounded-full border border-zinc-700 bg-zinc-900/60 px-3 py-1 text-[11px] text-zinc-400">
              {previewDays} gün operasyon
            </span>
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">
            Seçtiğiniz kemik sorular makale başlıklarına dönüştürülür ve mevcut
            webhook / Make.com dağıtım hattına işletme adınızla birlikte
            gönderilir.
          </p>
        </div>
      </div>
    </div>
  );
}
