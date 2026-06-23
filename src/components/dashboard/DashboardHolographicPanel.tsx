"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { bindPointerParallax, isMobileViewport } from "@/lib/pointer-parallax";

interface DashboardHolographicPanelProps {
  children: ReactNode;
}

export default function DashboardHolographicPanel({
  children,
}: DashboardHolographicPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return bindPointerParallax((x, y) => {
      if (!panelRef.current) return;

      const mobile = isMobileViewport();
      const yFactor = mobile ? 2.2 : 5;
      const xFactor = mobile ? 1.8 : 4;

      panelRef.current.style.transform = [
        "perspective(1200px)",
        `rotateY(${x * yFactor}deg)`,
        `rotateX(${-y * xFactor}deg)`,
        "translateZ(0)",
      ].join(" ");
    });
  }, []);

  return (
    <div className="dc-holo-outer [perspective:1200px]">
      <div ref={panelRef} className="dc-holo-panel will-change-transform">
        <div className="dc-holo-panel-inner">{children}</div>
      </div>
    </div>
  );
}
