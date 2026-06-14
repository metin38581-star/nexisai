"use client";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  progress?: number;
  animatedProgress?: number;
  accent?: "violet" | "blue" | "emerald";
  isAnimating?: boolean;
}

const accentGradients = {
  violet: "from-violet-500/20 to-transparent",
  blue: "from-blue-500/20 to-transparent",
  emerald: "from-emerald-500/20 to-transparent",
};

export default function MetricCard({
  title,
  value,
  subtitle,
  progress,
  animatedProgress,
  accent = "violet",
  isAnimating = false,
}: MetricCardProps) {
  const displayProgress = animatedProgress ?? progress ?? 0;

  return (
    <div
      className={`glass-card relative overflow-hidden p-6 transition-all duration-500 ${
        isAnimating ? "ring-1 ring-violet-500/20 shadow-neon" : ""
      }`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${accentGradients[accent]}`}
      />
      <div className="relative">
        <p className="text-sm font-medium text-muted">{title}</p>
        <p
          className={`mt-3 text-4xl font-bold tracking-tight text-white transition-all duration-300 ${
            isAnimating ? "text-gradient" : ""
          }`}
        >
          {value}
        </p>
        {subtitle && (
          <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
        )}
        {progress !== undefined && (
          <div className="mt-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-[1400ms] ease-out"
                style={{ width: `${Math.min(displayProgress, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Bütçenin %{Math.round(displayProgress)}&apos;si kullanıldı
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
