"use client";

import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";

interface VisibilityRingProps {
  value: number;
  animate?: boolean;
}

export default function VisibilityRing({
  value,
  animate = true,
}: VisibilityRingProps) {
  const animatedValue = useAnimatedNumber(0, value, {
    enabled: animate,
    duration: 1800,
  });

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(animatedValue, 0), 100) / 100;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
      <svg className="-rotate-90" width="160" height="160" viewBox="0 0 160 160">
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="10"
        />
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="url(#visibilityGradient)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-300"
        />
        <defs>
          <linearGradient id="visibilityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tracking-tight text-white">
          %{animatedValue}
        </span>
        <span className="mt-1 text-xs text-zinc-500">Görünürlük</span>
      </div>
    </div>
  );
}
