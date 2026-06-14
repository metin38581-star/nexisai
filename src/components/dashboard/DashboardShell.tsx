"use client";

import { useState } from "react";
import AnalysisDashboard from "@/components/dashboard/AnalysisDashboard";

export default function DashboardShell() {
  const [walletRefreshToken, setWalletRefreshToken] = useState(0);

  return (
    <AnalysisDashboard
      walletRefreshToken={walletRefreshToken}
      onWalletRefresh={() => setWalletRefreshToken((value) => value + 1)}
    />
  );
}
