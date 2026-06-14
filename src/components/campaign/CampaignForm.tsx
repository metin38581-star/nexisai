"use client";

import { useState } from "react";
import type { CampaignFormData, BusinessSector } from "@/types/campaign";
import {
  SECTOR_OPTIONS,
  TURKEY_CITY_OPTIONS,
  DEFAULT_CITY,
  DEFAULT_SECTOR,
} from "@/lib/constants";
import type { TurkishCitySlug } from "@/lib/turkey-cities";
import CyberBudgetField from "@/components/campaign/CyberBudgetField";

interface CampaignFormProps {
  onSubmit: (data: CampaignFormData) => void;
  isLoading: boolean;
}

const initialForm: CampaignFormData = {
  businessName: "",
  sector: DEFAULT_SECTOR,
  city: DEFAULT_CITY,
  dailyBudget: 20,
  campaignDays: 7,
};

export default function CampaignForm({
  onSubmit,
  isLoading,
}: CampaignFormProps) {
  const [form, setForm] = useState<CampaignFormData>(initialForm);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
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
          Yapay Zeka Reklam Yönetimi
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          İşletme bilgilerinizi girin, bütçe ve operasyon süresine göre GEO
          agresiflik seviyeniz otomatik belirlensin.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField label="İşletme / Marka Adı">
          <input
            type="text"
            required
            placeholder="Örn: Kayseri Dent Klinik"
            value={form.businessName}
            onChange={(e) => updateField("businessName", e.target.value)}
            className={inputClass}
          />
        </FormField>

        <FormField label="İşletme Sektörü">
          <select
            value={form.sector}
            onChange={(e) =>
              updateField("sector", e.target.value as BusinessSector)
            }
            className={inputClass}
          >
            {SECTOR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Şehir">
          <select
            required
            value={form.city}
            onChange={(e) =>
              updateField("city", e.target.value as TurkishCitySlug)
            }
            className={inputClass}
          >
            {TURKEY_CITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <CyberBudgetField
          label="Günlük Operasyon Bütçesi ($)"
          value={form.dailyBudget}
          min={10}
          max={150}
          step={5}
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

        <button
          type="submit"
          disabled={isLoading}
          className="group relative mt-2 w-full overflow-hidden rounded-xl py-4 text-base font-semibold text-white transition-all duration-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="absolute inset-0 bg-neon-gradient opacity-90 transition-opacity duration-500 group-hover:opacity-100" />
          <span className="absolute inset-0 bg-neon-gradient opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-60" />
          <span className="absolute inset-[1px] rounded-[11px] bg-zinc-950/20 backdrop-blur-sm transition-all duration-500 group-hover:bg-zinc-950/10" />
          <span className="relative flex items-center justify-center gap-2 transition-shadow duration-500 group-hover:drop-shadow-[0_0_12px_rgba(167,139,250,0.6)]">
            {isLoading ? "Kampanya Başlatılıyor..." : "Yapay Zeka Reklamını Başlat 🚀"}
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

const inputClass =
  "w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-white placeholder:text-zinc-600 transition-colors duration-200 focus:border-violet-500/40 focus:outline-none focus:ring-1 focus:ring-violet-500/20";
