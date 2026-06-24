import type { ReactNode } from "react";

interface DashboardHolographicPanelProps {
  children: ReactNode;
}

export default function DashboardHolographicPanel({
  children,
}: DashboardHolographicPanelProps) {
  return (
    <div className="dc-holo-outer">
      <div className="dc-holo-panel">
        <div className="dc-holo-panel-inner">{children}</div>
      </div>
    </div>
  );
}
