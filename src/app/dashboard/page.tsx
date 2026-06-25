"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Navbar from "@/components/layout/Navbar";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DashboardCyberScene3D from "@/components/dashboard/DashboardCyberScene3D";
import CorporateFooter from "@/components/layout/CorporateFooter";
import AuthModal, { type AuthViewMode } from "@/components/auth/AuthModal";
import { useAuth } from "@/context/AuthContext";
import type { CampaignFormData, CampaignFormCity, CampaignFormSector } from "@/types/campaign";
import { MIN_CAMPAIGN_DAILY_BUDGET, MIN_CAMPAIGN_DAYS } from "@/lib/campaign-form-utils";
import "@/components/dashboard/dashboard-cyber.css";

function PaymentResumeHandler({
  onResume,
}: {
  onResume: (data: CampaignFormData) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("resumeCampaign") !== "1") {
      return;
    }

    if (searchParams.get("payment") !== "success") {
      return;
    }

    const businessName = searchParams.get("companyName")?.trim() ?? "";
    const sector = searchParams.get("sector")?.trim() ?? "";
    const city = searchParams.get("city")?.trim() ?? "";
    const budget = Number(searchParams.get("budget"));
    const campaignDays = Number(searchParams.get("campaignDays"));

    if (!businessName || !city) {
      return;
    }

    onResume({
      businessName,
      sector: sector as CampaignFormSector,
      city: city as CampaignFormCity,
      dailyBudget: Number.isFinite(budget)
        ? budget
        : MIN_CAMPAIGN_DAILY_BUDGET,
      campaignDays: Number.isFinite(campaignDays)
        ? campaignDays
        : MIN_CAMPAIGN_DAYS,
      selectedQuestionIds: [],
    });

    toast.success(
      "Ödeme başarılı! Kampanya formu dolduruldu — Kampanyayı Başlat'a tıklayın.",
    );

    window.history.replaceState(null, "", "/dashboard");
  }, [onResume, searchParams]);

  return null;
}

function DashboardPageContent() {
  const { login } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<AuthViewMode>("register");
  const [pendingCampaign, setPendingCampaign] =
    useState<CampaignFormData | null>(null);

  const handleRequireAuth = useCallback((data?: CampaignFormData) => {
    if (data) {
      setPendingCampaign(data);
    }
    setAuthMode("register");
    setShowAuthModal(true);
  }, []);

  const handlePendingCampaignHandled = useCallback(() => {
    setPendingCampaign(null);
  }, []);

  const handlePaymentResume = useCallback((data: CampaignFormData) => {
    setPendingCampaign(data);
  }, []);

  const handleAuthSuccess = useCallback(
    (payload: {
      userName: string;
      userEmail: string | null;
      userId: string;
      accessToken: string;
      refreshToken?: string;
    }) => {
      login(payload);
      setShowAuthModal(false);
    },
    [login],
  );

  const handleAuthModalClose = useCallback(() => {
    setShowAuthModal(false);
    setPendingCampaign(null);
  }, []);

  return (
    <div className="dashboard-cyber relative flex min-h-screen flex-col overflow-x-hidden bg-[#050505] text-white">
      <DashboardCyberScene3D />
      <div className="dc-grid-overlay" aria-hidden />
      <PaymentResumeHandler onResume={handlePaymentResume} />
      <Navbar />
      <main className="relative z-10 flex-1">
        <DashboardShell
          pendingCampaign={pendingCampaign}
          onPendingCampaignHandled={handlePendingCampaignHandled}
          onRequireAuth={handleRequireAuth}
        />
      </main>
      <CorporateFooter />
      <AuthModal
        isOpen={showAuthModal}
        onClose={handleAuthModalClose}
        onSuccess={handleAuthSuccess}
        authMode={authMode}
        onAuthModeChange={setAuthMode}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardPageContent />
    </Suspense>
  );
}
