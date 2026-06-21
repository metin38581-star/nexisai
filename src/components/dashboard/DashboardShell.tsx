"use client";

import { useState } from "react";
import AnalysisDashboard from "@/components/dashboard/AnalysisDashboard";
import type { CampaignFormData } from "@/types/campaign";

interface DashboardShellProps {
  pendingCampaign?: CampaignFormData | null;
  onPendingCampaignHandled?: () => void;
  onRequireAuth?: (data?: CampaignFormData) => void;
}

export default function DashboardShell({
  pendingCampaign = null,
  onPendingCampaignHandled,
  onRequireAuth,
}: DashboardShellProps) {
  const [walletRefreshToken, setWalletRefreshToken] = useState(0);

  return (
    <AnalysisDashboard
      walletRefreshToken={walletRefreshToken}
      onWalletRefresh={() => setWalletRefreshToken((value) => value + 1)}
      pendingCampaign={pendingCampaign}
      onPendingCampaignHandled={onPendingCampaignHandled}
      onRequireAuth={onRequireAuth}
    />
  );
}
