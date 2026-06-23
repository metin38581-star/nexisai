"use client";

import type { ReactNode } from "react";

interface OrbitRingIconProps {
  children: ReactNode;
  className?: string;
}

export default function OrbitRingIcon({
  children,
  className = "",
}: OrbitRingIconProps) {
  return (
    <div className={`dc-orbit-icon ${className}`}>
      <span className="dc-orbit-ring dc-orbit-ring-a" aria-hidden />
      <span className="dc-orbit-ring dc-orbit-ring-b" aria-hidden />
      <span className="relative z-10 flex h-full w-full items-center justify-center">
        {children}
      </span>
    </div>
  );
}
