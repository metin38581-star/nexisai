"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface DashboardHolographicPanelProps {
  children: ReactNode;
}

export default function DashboardHolographicPanel({
  children,
}: DashboardHolographicPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!panelRef.current) return;
      panelRef.current.style.transform = [
        "perspective(1200px)",
        `rotateY(${x * 5}deg)`,
        `rotateX(${-y * 4}deg)`,
        "translateZ(0)",
      ].join(" ");
    };

    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  return (
    <div className="dc-holo-outer [perspective:1200px]">
      <div ref={panelRef} className="dc-holo-panel will-change-transform">
        <div className="dc-holo-panel-inner">{children}</div>
      </div>
    </div>
  );
}
