"use client";

import { useState } from "react";
import BackgroundGlow from "@/components/layout/BackgroundGlow";
import Navbar from "@/components/layout/Navbar";
import DashboardShell from "@/components/dashboard/DashboardShell";
import CorporateFooter from "@/components/layout/CorporateFooter";
import AuthModal, { type AuthViewMode } from "@/components/auth/AuthModal";
import { useAuth } from "@/context/AuthContext";
import type { CampaignFormData } from "@/types/campaign";

export default function DashboardPage() {
  const { login } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<AuthViewMode>("register");
  const [pendingCampaign, setPendingCampaign] =
    useState<CampaignFormData | null>(null);

  const handleRequireAuth = (data?: CampaignFormData) => {
    if (data) {
      setPendingCampaign(data);
    }
    setAuthMode("register");
    setShowAuthModal(true);
  };

  const handleAuthSuccess = (payload: {
    userName: string;
    userEmail: string | null;
    userId: string;
    accessToken: string;
  }) => {
    login(payload);
    setShowAuthModal(false);
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-black text-white">
      <BackgroundGlow />
      <Navbar />
      <main className="relative z-10 flex-1">
        <DashboardShell
          pendingCampaign={pendingCampaign}
          onPendingCampaignHandled={() => setPendingCampaign(null)}
          onRequireAuth={handleRequireAuth}
        />
      </main>
      <CorporateFooter />
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setPendingCampaign(null);
        }}
        onSuccess={handleAuthSuccess}
        authMode={authMode}
        onAuthModeChange={setAuthMode}
      />
    </div>
  );
}
