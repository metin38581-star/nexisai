"use client";

import type { LlmInquiryResult } from "@/types/campaign";
import VisibilityRing from "@/components/dashboard/VisibilityRing";

interface AnalysisInsightsPanelProps {
  llmResult: LlmInquiryResult | null;
  markaAdi: string;
  isLoading: boolean;
}

function resolveMarketStatus(llmResult: LlmInquiryResult | null): {
  label: string;
  tone: "danger" | "warning" | "success";
} {
  if (!llmResult) {
    return { label: "Analiz Bekleniyor", tone: "warning" };
  }

  if (llmResult.listed) {
    return { label: "Aktif Görünürlük", tone: "success" };
  }

  const summary = llmResult.analysisSummary.toLocaleLowerCase("tr-TR");
  if (summary.includes("bulunamad") || summary.includes("tespit edilemedi")) {
    return { label: "Bulunamadı", tone: "danger" };
  }

  return { label: "Düşük Görünürlük", tone: "warning" };
}

const STATUS_STYLES = {
  danger: "border-red-500/30 bg-red-500/10 text-red-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

export default function AnalysisInsightsPanel({
  llmResult,
  markaAdi,
  isLoading,
}: AnalysisInsightsPanelProps) {
  const marketStatus = resolveMarketStatus(llmResult);

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="glass-card border border-violet-500/20 p-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-400">
          Canlı Analiz Özeti
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">{markaAdi}</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Marka görünürlüğü ve pazar indeks analizi
        </p>
      </div>

      <div className="grid flex-1 gap-5 lg:grid-cols-2">
        <InsightCard title="Pazar Durumu" subtitle="Yapay zeka indeks durumu">
          {isLoading && !llmResult ? (
            <LoadingPulse />
          ) : (
            <div
              className={`inline-flex rounded-full border px-4 py-2 text-sm font-semibold ${STATUS_STYLES[marketStatus.tone]}`}
            >
              {marketStatus.label}
            </div>
          )}
          {llmResult?.usedLocalDataFallback && (
            <p className="mt-3 text-xs text-cyan-400/80">
              Güvenli Yerel Veri Katmanı aktif — marka analizi tamamlandı.
            </p>
          )}
        </InsightCard>

        <InsightCard
          title="Görünürlük Skoru"
          subtitle="YZ motorlarındaki mevcut pay"
        >
          {isLoading && !llmResult ? (
            <div className="flex h-40 items-center justify-center">
              <LoadingPulse />
            </div>
          ) : (
            <VisibilityRing
              value={llmResult?.yapayZekaGorunurlukOrani ?? 0}
              animate={!isLoading}
            />
          )}
        </InsightCard>
      </div>
    </div>
  );
}

function InsightCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card flex flex-col justify-center border border-white/5 p-5 lg:min-h-[220px]">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mb-4 text-xs text-zinc-500">{subtitle}</p>
      {children}
    </div>
  );
}

function LoadingPulse() {
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-500">
      <span className="h-2 w-2 animate-pulse rounded-full bg-violet-400" />
      Veriler işleniyor...
    </div>
  );
}
