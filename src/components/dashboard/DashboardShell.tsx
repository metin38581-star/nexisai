"use client";

import { useCallback, useState } from "react";
import AnalysisDashboard from "@/components/dashboard/AnalysisDashboard";
import type { CampaignFormData } from "@/types/campaign";

interface DashboardShellProps {
  pendingCampaign?: CampaignFormData | null;
  onPendingCampaignHandled?: () => void;
  onRequireAuth?: (data?: CampaignFormData) => void;
  walletRefreshToken?: number;
  onWalletRefresh?: () => void;
  startedCampaignId?: string | null;
}

export default function DashboardShell({
  pendingCampaign = null,
  onPendingCampaignHandled,
  onRequireAuth,
  walletRefreshToken: walletRefreshTokenProp,
  onWalletRefresh: onWalletRefreshProp,
  startedCampaignId = null,
}: DashboardShellProps) {
  const [internalWalletRefreshToken, setInternalWalletRefreshToken] = useState(0);
  const walletRefreshToken =
    walletRefreshTokenProp ?? internalWalletRefreshToken;

  const handleWalletRefresh = useCallback(() => {
    if (onWalletRefreshProp) {
      onWalletRefreshProp();
      return;
    }

    setInternalWalletRefreshToken((value) => value + 1);
  }, [onWalletRefreshProp]);

  return (
    <AnalysisDashboard
      walletRefreshToken={walletRefreshToken}
      onWalletRefresh={handleWalletRefresh}
      pendingCampaign={pendingCampaign}
      onPendingCampaignHandled={onPendingCampaignHandled}
      onRequireAuth={onRequireAuth}
      startedCampaignId={startedCampaignId}
    />
  );
}
