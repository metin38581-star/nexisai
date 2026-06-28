"use client";

import {
  Globe2,
  MapPin,
  Radio,
  Satellite,
  ShieldCheck,
} from "lucide-react";

export type CampaignOperationPhase =
  | "idle"
  | "launching"
  | "processing"
  | "distributing"
  | "active"
  | "failed";

interface CampaignOperationStatusPanelProps {
  markaAdi: string;
  sehir: string;
  phase: CampaignOperationPhase;
  authorityScore: number | null;
  channelCount: number;
  errorMessage?: string | null;
}

const DISTRIBUTION_CHANNELS = [
  { id: "reddit", label: "Reddit", emoji: "🔴" },
  { id: "medium", label: "Medium", emoji: "📝" },
  { id: "forum", label: "Sektörel Forum", emoji: "💬" },
  { id: "blog", label: "Yerel Blog", emoji: "📰" },
] as const;

function resolveOperationLabel(phase: CampaignOperationPhase): {
  title: string;
  tone: "emerald" | "violet" | "amber" | "rose";
  pulse: boolean;
} {
  switch (phase) {
    case "launching":
      return {
        title: "Operasyon Başlatılıyor",
        tone: "amber",
        pulse: true,
      };
    case "processing":
      return {
        title: "GEO Analizi ve İçerik Hazırlığı Devam Ediyor",
        tone: "violet",
        pulse: true,
      };
    case "distributing":
      return {
        title: "Dijital Otorite Ağlarına Dağıtım Yapılıyor",
        tone: "violet",
        pulse: true,
      };
    case "active":
      return {
        title: "Aktif — Optimizasyon Döngüsü Başlatıldı",
        tone: "emerald",
        pulse: true,
      };
    case "failed":
      return {
        title: "Operasyon Tamamlanamadı",
        tone: "rose",
        pulse: false,
      };
    default:
      return {
        title: "Operasyon Bekleniyor",
        tone: "violet",
        pulse: false,
      };
  }
}

const toneStyles = {
  emerald: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    text: "text-emerald-300",
    dot: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]",
  },
  violet: {
    border: "border-violet-500/30",
    bg: "bg-violet-500/10",
    text: "text-violet-300",
    dot: "bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.8)]",
  },
  amber: {
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    text: "text-amber-300",
    dot: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]",
  },
  rose: {
    border: "border-rose-500/30",
    bg: "bg-rose-500/10",
    text: "text-rose-300",
    dot: "bg-rose-400",
  },
} as const;

export default function CampaignOperationStatusPanel({
  markaAdi,
  sehir,
  phase,
  authorityScore,
  channelCount,
  errorMessage,
}: CampaignOperationStatusPanelProps) {
  const operation = resolveOperationLabel(phase);
  const tone = toneStyles[operation.tone];
  const displayScore =
    authorityScore !== null ? Math.round(authorityScore) : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-zinc-950/80 shadow-[0_0_40px_rgba(124,58,237,0.08)]">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative border-b border-white/5 px-5 py-4 sm:px-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-violet-400">
          Operasyon Özeti
        </p>
        <h3 className="mt-1 text-lg font-semibold text-white">
          {markaAdi} · GEO Durum Paneli
        </h3>
      </div>

      <div className="relative grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
        <StatusCard
          icon={<Satellite className="h-5 w-5" />}
          label="Operasyon Durumu"
          tone={tone}
          pulse={operation.pulse}
        >
          <p className={`text-sm font-semibold leading-snug ${tone.text}`}>
            {operation.title}
          </p>
          {phase === "failed" && errorMessage ? (
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              {errorMessage}
            </p>
          ) : null}
        </StatusCard>

        <StatusCard
          icon={<ShieldCheck className="h-5 w-5" />}
          label="Güven Skoru (GEO Index)"
          tone={{
            border: "border-cyan-500/25",
            bg: "bg-cyan-500/10",
            text: "text-cyan-300",
            dot: "bg-cyan-400",
          }}
        >
          {displayScore !== null ? (
            <p className="text-2xl font-bold tracking-tight text-white">
              %{displayScore}
              <span className="ml-2 text-sm font-medium text-cyan-300/90">
                Otorite Gücü
              </span>
            </p>
          ) : (
            <p className="text-sm text-zinc-400">Hesaplanıyor...</p>
          )}
        </StatusCard>

        <StatusCard
          icon={<MapPin className="h-5 w-5" />}
          label="Hedef Bölge"
          tone={{
            border: "border-fuchsia-500/25",
            bg: "bg-fuchsia-500/10",
            text: "text-fuchsia-300",
            dot: "bg-fuchsia-400",
          }}
        >
          <p className="text-xl font-semibold text-white">{sehir}</p>
          <p className="mt-1 text-xs text-zinc-500">Yerel GEO hedefi</p>
        </StatusCard>

        <StatusCard
          icon={<Globe2 className="h-5 w-5" />}
          label="Dağıtım Kanalları"
          tone={{
            border: "border-emerald-500/25",
            bg: "bg-emerald-500/10",
            text: "text-emerald-300",
            dot: "bg-emerald-400",
          }}
        >
          <p className="text-sm font-semibold leading-snug text-white">
            {channelCount} Farklı Dijital Otorite Ağı Tetiklendi
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {DISTRIBUTION_CHANNELS.map((channel) => (
              <span
                key={channel.id}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-zinc-900/70 px-2 py-0.5 text-[10px] font-medium text-zinc-300"
                title={channel.label}
              >
                <span aria-hidden>{channel.emoji}</span>
                {channel.label}
              </span>
            ))}
          </div>
        </StatusCard>
      </div>

      {phase !== "idle" && phase !== "failed" ? (
        <div className="relative border-t border-white/5 px-5 py-3 sm:px-6">
          <p className="flex items-center gap-2 text-xs text-zinc-500">
            <Radio className="h-3.5 w-3.5 text-violet-400" />
            Arka plan optimizasyonu sessizce devam ediyor; panel otomatik
            güncellenir.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function StatusCard({
  icon,
  label,
  tone,
  pulse = false,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  tone: {
    border: string;
    bg: string;
    text: string;
    dot: string;
  };
  pulse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border ${tone.border} ${tone.bg} p-4 backdrop-blur-sm`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-zinc-400">
          <span className={tone.text}>{icon}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider">
            {label}
          </span>
        </div>
        {pulse ? (
          <span
            className={`h-2 w-2 rounded-full ${tone.dot} animate-pulse`}
            aria-hidden
          />
        ) : null}
      </div>
      {children}
    </div>
  );
}
