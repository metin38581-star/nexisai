"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DashboardCyberScene3D from "@/components/dashboard/DashboardCyberScene3D";
import CorporateFooter from "@/components/layout/CorporateFooter";
import AuthModal, { type AuthViewMode } from "@/components/auth/AuthModal";
import { useAuth } from "@/context/AuthContext";
import type { CampaignFormData } from "@/types/campaign";
import "@/components/dashboard/dashboard-cyber.css";

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
    <div className="dashboard-cyber relative flex min-h-screen flex-col overflow-x-hidden bg-[#050505] text-white">
      <DashboardCyberScene3D />
      <div className="dc-grid-overlay" aria-hidden />
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
