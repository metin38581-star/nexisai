"use client";

import { useEffect, useState } from "react";
import type { StoredCampaign } from "@/types/campaign";
import { getCampaignMetaFromDb } from "@/lib/agresiflik";
import { buildHubArticleUrl } from "@/lib/hub-url";

interface CampaignHistoryPanelProps {
  campaigns: StoredCampaign[];
  isLoading: boolean;
}

function hasLiveUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && url.trim().length > 0;
}

function CampaignPublishLinks({
  slug,
  externalLiveUrl,
}: {
  slug?: string | null;
  externalLiveUrl?: string | null;
}) {
  const hasSlug = hasLiveUrl(slug);
  const hasExternal = hasLiveUrl(externalLiveUrl);

  if (!hasSlug && !hasExternal) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {hasSlug ? (
        <a
          href={buildHubArticleUrl(slug)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          🌐 NexisAI Sayfasını Gör
        </a>
      ) : null}
      {hasExternal ? (
        <a
          href={externalLiveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          🚀 WordPress / Dış Yayını Gör
        </a>
      ) : null}
    </div>
  );
}

function resolveExternalUrl(
  externalLiveUrl: string | null | undefined,
  liveUrl: string | null | undefined,
): string | undefined {
  if (hasLiveUrl(externalLiveUrl)) {
    return externalLiveUrl;
  }
  if (hasLiveUrl(liveUrl)) {
    return liveUrl;
  }
  return undefined;
}

function resolveScoreStyle(skor: number): {
  ring: string;
  badge: string;
  label: string;
} {
  if (skor >= 70) {
    return {
      ring: "from-emerald-400 to-cyan-400",
      badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
      label: "Yüksek Görünürlük",
    };
  }

  if (skor >= 40) {
    return {
      ring: "from-amber-400 to-orange-400",
      badge: "border-amber-500/40 bg-amber-500/10 text-amber-300",
      label: "Orta Görünürlük",
    };
  }

  return {
    ring: "from-red-400 to-rose-500",
    badge: "border-red-500/40 bg-red-500/10 text-red-300",
    label: "Düşük Görünürlük",
  };
}

function formatCampaignDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}s ${String(minutes).padStart(2, "0")}dk ${String(seconds).padStart(2, "0")}sn`;
  }

  if (minutes > 0) {
    return `${minutes}dk ${String(seconds).padStart(2, "0")}sn`;
  }

  return `${seconds}sn`;
}

function resolveBotRadar(campaign: StoredCampaign): {
  percent: number;
  label: string;
} {
  if (campaign.isOptimized || campaign.gunlukButce > 100) {
    return { percent: 94, label: "İndeks Gücü" };
  }
  return { percent: 38, label: "Tarama Frekansı" };
}

function resolveEnjeksiyonHizi(gunlukButce: number): {
  text: string;
  badgeClass: string;
} {
  if (gunlukButce > 100) {
    return {
      text: "⚡ IŞIK HIZI (Ultra Sızma)",
      badgeClass:
        "border-red-500/30 bg-red-500/10 text-red-300 shadow-[0_0_12px_rgba(248,113,113,0.2)]",
    };
  }
  if (gunlukButce > 50) {
    return {
      text: "🔥 AGRESİF",
      badgeClass:
        "border-purple-500/30 bg-purple-500/10 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.2)]",
    };
  }
  if (gunlukButce > 15) {
    return {
      text: "⚡ STANDART",
      badgeClass:
        "border-blue-500/30 bg-blue-500/10 text-blue-300 shadow-[0_0_12px_rgba(96,165,250,0.2)]",
    };
  }
  return {
    text: "🍃 SAKİN",
    badgeClass:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.2)]",
  };
}

function SignalWaveIcon() {
  return (
    <span className="relative flex h-4 w-4 shrink-0 items-end justify-center gap-[2px]">
      <span className="h-1.5 w-[2px] animate-pulse rounded-full bg-violet-400/80" />
      <span className="h-2.5 w-[2px] animate-pulse rounded-full bg-violet-300 delay-75" />
      <span className="h-3.5 w-[2px] animate-pulse rounded-full bg-fuchsia-400 delay-150" />
      <span className="absolute -inset-1 rounded-full bg-violet-500/10 blur-sm" />
    </span>
  );
}

function CyberPulseDot({ tone = "emerald" }: { tone?: "emerald" | "violet" | "cyan" }) {
  const colorClass =
    tone === "violet"
      ? "bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.8)]"
      : tone === "cyan"
        ? "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]"
        : "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]";

  return (
    <span className="relative flex h-1.5 w-1.5 shrink-0">
      <span
        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${colorClass}`}
      />
      <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${colorClass}`} />
    </span>
  );
}

function resolveSiberSignalGucu(gunlukButce: number): string {
  if (gunlukButce > 100) {
    return "150/150 GHz";
  }
  if (gunlukButce > 50) {
    return "80/80 GHz";
  }
  if (gunlukButce > 15) {
    return "40/40 GHz";
  }
  return "15/15 GHz";
}

function CyberMetricsGrid({ campaign }: { campaign: StoredCampaign }) {
  const botRadar = resolveBotRadar(campaign);
  const signalGucu = resolveSiberSignalGucu(campaign.gunlukButce);
  const enjeksiyon = resolveEnjeksiyonHizi(campaign.gunlukButce);
  const metricBoxClass =
    "rounded-lg border border-purple-500/10 bg-slate-950/40 px-2.5 py-2 backdrop-blur-sm";

  return (
    <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
      <div className={metricBoxClass}>
        <div className="flex items-center gap-1.5">
          <SignalWaveIcon />
          <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-violet-400">
            Siber Sinyal Gücü
          </p>
        </div>
        <p className="mt-1.5 text-xs font-bold text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.35)]">
          {signalGucu}
        </p>
      </div>

      <div className={metricBoxClass}>
        <div className="flex items-center gap-1.5">
          <CyberPulseDot tone="cyan" />
          <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-cyan-400">
            Bot Tarama Radarı
          </p>
        </div>
        <p className="mt-1.5 text-xs font-bold text-violet-200">
          %{botRadar.percent} {botRadar.label}
        </p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-900/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-600 via-purple-400 to-emerald-400 shadow-[0_0_8px_rgba(167,139,250,0.45)]"
            style={{ width: `${botRadar.percent}%` }}
          />
        </div>
      </div>

      <div className={metricBoxClass}>
        <div className="flex items-center gap-1.5">
          <CyberPulseDot tone="violet" />
          <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-violet-300/90">
            Enjeksiyon Hızı
          </p>
        </div>
        <span
          className={`mt-1.5 inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold leading-tight ${enjeksiyon.badgeClass}`}
        >
          {enjeksiyon.text}
        </span>
      </div>
    </div>
  );
}

function RadarTrackingStatus({
  lastCheckedAt,
  createdAt,
  radarIntervalMs,
}: {
  lastCheckedAt: string | null;
  createdAt: string;
  radarIntervalMs: number;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const anchorMs = new Date(lastCheckedAt ?? createdAt).getTime();
  const nextCheckMs = anchorMs + radarIntervalMs;
  const remainingMs = nextCheckMs - now;
  const isDue = remainingMs <= 0;

  return (
    <div className="mt-2.5 border-t border-white/5 pt-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-400/90">
        Otomatik Takip Aktif
      </p>
      <p className="mt-1 text-[10px] leading-snug text-zinc-500">
        {isDue ? (
          <span className="text-amber-300">Tarama motoru sıradaki kontrolü başlatıyor...</span>
        ) : (
          <>
            Sonraki radar taraması:{" "}
            <span className="font-medium text-zinc-300">
              {formatCountdown(remainingMs)}
            </span>
          </>
        )}
      </p>
    </div>
  );
}

function LlmInjectionStatus({
  isOptimized,
  lastCheckedAt,
  createdAt,
  radarIntervalMs,
}: {
  isOptimized: boolean;
  lastCheckedAt: string | null;
  createdAt: string;
  radarIntervalMs: number;
}) {
  return (
    <div
      className={`w-full rounded-xl border px-3 py-2.5 sm:min-w-[280px] ${
        isOptimized
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-red-500/30 bg-red-500/5"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
        LLM Enjeksiyon Durumu
      </p>
      <div className="mt-2 flex items-center gap-2.5">
        <span className="relative flex h-3 w-3 shrink-0">
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
              isOptimized ? "bg-emerald-400" : "bg-red-500"
            }`}
          />
          <span
            className={`relative inline-flex h-3 w-3 rounded-full ${
              isOptimized
                ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]"
                : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]"
            }`}
          />
        </span>
        <p
          className={`text-[11px] font-medium leading-snug ${
            isOptimized ? "text-emerald-300" : "text-red-300"
          }`}
        >
          {isOptimized
            ? "LLM ENJEKSİYON BAŞARILI (Gemini Öneriyor!)"
            : "ARAMA MOTORU TARAMASI BEKLENİYOR (Yemler Aktif)"}
        </p>
      </div>
      <RadarTrackingStatus
        lastCheckedAt={lastCheckedAt}
        createdAt={createdAt}
        radarIntervalMs={radarIntervalMs}
      />
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: StoredCampaign }) {
  const [expanded, setExpanded] = useState(false);
  const scoreStyle = resolveScoreStyle(campaign.skor);
  const toplamButce = campaign.gunlukButce * campaign.gunSayisi;
  const meta = getCampaignMetaFromDb(campaign);
  const badgeClass = `inline-flex rounded-full border bg-zinc-950/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${meta.renk}`;
  const primaryBait = campaign.baits[0];
  const hubSlug = primaryBait?.slug;
  const externalUrl = resolveExternalUrl(
    campaign.externalLiveUrl ?? primaryBait?.externalLiveUrl,
    primaryBait?.liveUrl ?? campaign.liveUrl,
  );

  return (
    <article className="glass-card overflow-hidden border border-violet-500/15 transition-colors hover:border-violet-500/30">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border bg-gradient-to-br ${scoreStyle.ring} p-[2px]`}
            >
              <div className="flex h-full w-full items-center justify-center rounded-full bg-zinc-950/90">
                <span className="text-sm font-bold text-white">%{campaign.skor}</span>
              </div>
            </div>

            <CyberMetricsGrid campaign={campaign} />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-400">
              GEO Operasyon Kaydı
            </p>
            <h3 className="mt-1 truncate text-lg font-semibold text-white">
              {campaign.markaAdi}
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              <span className="text-zinc-300">{campaign.sehir}</span>
              <span className="mx-2 text-zinc-600">·</span>
              <span>{campaign.sektor}</span>
            </p>
            <p className="mt-2 text-[11px] text-zinc-500">
              {formatCampaignDate(campaign.createdAt)} · {campaign.baits.length} gizli makale
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
                Toplam Bütçe: ${toplamButce.toLocaleString("en-US")}
              </span>
              <span className={badgeClass}>
                Agresiflik: {meta.agresiflik}
              </span>
              <span className={badgeClass}>
                Radar: {meta.radar}
              </span>
              <span className="inline-flex rounded-full border border-zinc-700/60 bg-zinc-900/60 px-2.5 py-1 text-[10px] font-medium text-zinc-400">
                ${campaign.gunlukButce}/gün · {campaign.gunSayisi} gün
              </span>
            </div>
            <CampaignPublishLinks slug={hubSlug} externalLiveUrl={externalUrl} />
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col items-stretch gap-2 sm:w-auto sm:items-end">
          <LlmInjectionStatus
            isOptimized={campaign.isOptimized}
            lastCheckedAt={campaign.lastCheckedAt}
            createdAt={campaign.createdAt}
            radarIntervalMs={meta.radarIntervalMs}
          />
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${scoreStyle.badge}`}
          >
            {scoreStyle.label}
          </span>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-300 transition hover:border-cyan-400/50 hover:bg-cyan-500/15"
          >
            {expanded ? "Detayları Gizle" : "GEO Makalelerini Aç"}
            <span
              className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            >
              ▾
            </span>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-violet-500/10 bg-zinc-950/50 px-5 py-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-cyan-400">
            NexisAI Hub · Hibrid Dağıtım Makaleleri
          </p>
          <div className="space-y-3">
            {campaign.baits.map((bait, index) => (
              <details
                key={bait.id}
                className="group rounded-xl border border-white/5 bg-zinc-900/60 p-4"
                open={index === 0}
              >
                <summary className="cursor-pointer list-none text-sm font-semibold text-white marker:content-none">
                  <span className="text-violet-400">
                    [{index + 1}/{campaign.baits.length}]
                  </span>{" "}
                  {bait.baslik}
                  <span className="ml-2 text-[10px] font-normal text-zinc-500">
                    ({bait.platform})
                    {bait.yayinlandi || bait.status === "SUCCESS" ? (
                      <span className="ml-1 text-emerald-400">• Yayınlandı</span>
                    ) : bait.status === "FAILED" ? (
                      <span className="ml-1 text-rose-400">• Başarısız</span>
                    ) : (
                      <span className="ml-1 text-amber-400">• Bekliyor</span>
                    )}
                  </span>
                </summary>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">
                  {bait.icerik}
                </p>
                <CampaignPublishLinks
                  slug={bait.slug}
                  externalLiveUrl={resolveExternalUrl(
                    bait.externalLiveUrl,
                    bait.liveUrl,
                  )}
                />
              </details>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

export default function CampaignHistoryPanel({
  campaigns,
  isLoading,
}: CampaignHistoryPanelProps) {
  return (
    <section className="mt-10 border-t border-violet-500/10 pt-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-violet-400">
            Siber Veri Arşivi
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            Geçmiş GEO Operasyonları
          </h2>
        </div>
        {isLoading && (
          <span className="text-xs text-zinc-500">Veri hattı taranıyor...</span>
        )}
      </div>

      {isLoading && campaigns.length === 0 ? (
        <div className="glass-card border border-white/5 p-8 text-center text-sm text-zinc-500">
          Operasyon geçmişi yükleniyor...
        </div>
      ) : campaigns.length === 0 ? (
        <div className="glass-card border border-amber-500/20 bg-amber-500/5 p-8 text-center">
          <p className="text-sm text-amber-200/90">
            Siber veri hattında aktif operasyon bulunamadı. İlk GEO yemlemesini
            yukarıdan başlatın.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </section>
  );
}
