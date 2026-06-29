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
import { saveActiveCampaignId } from "@/lib/campaign-session";
import "@/components/dashboard/dashboard-cyber.css";

function PaymentResumeHandler({
  onResume,
  onCampaignStarted,
}: {
  onResume: (data: CampaignFormData) => void;
  onCampaignStarted: (campaignId: string) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("payment") !== "success") {
      return;
    }

    if (searchParams.get("campaignStarted") === "1") {
      const campaignId = searchParams.get("campaignId")?.trim();
      if (campaignId) {
        saveActiveCampaignId(campaignId);
        onCampaignStarted(campaignId);
        toast.success("Ödeme başarılı! Kampanya operasyonu başlatıldı.");
        window.history.replaceState(null, "", "/dashboard");
      }
      return;
    }

    if (searchParams.get("resumeCampaign") !== "1") {
      return;
    }

    const businessName = searchParams.get("companyName")?.trim() ?? "";
    const sectorSlugParam = searchParams.get("sectorSlug")?.trim() ?? "";
    const sectorLabel = searchParams.get("sector")?.trim() ?? "";
    const city = searchParams.get("city")?.trim() ?? "";
    const budget = Number(searchParams.get("budget"));
    const campaignDays = Number(searchParams.get("campaignDays"));
    const businessDomainParam = searchParams.get("businessDomain")?.trim() ?? "";
    const businessWebsiteParam = searchParams.get("businessWebsite")?.trim() ?? "";

    if (!businessName || !city) {
      return;
    }

    onResume({
      businessName,
      sector: (sectorSlugParam || sectorLabel) as CampaignFormSector,
      city: city as CampaignFormCity,
      dailyBudget: Number.isFinite(budget)
        ? budget
        : MIN_CAMPAIGN_DAILY_BUDGET,
      campaignDays: Number.isFinite(campaignDays)
        ? campaignDays
        : MIN_CAMPAIGN_DAYS,
      selectedQuestionIds:
      searchParams.get("selectedQuestionIds")?.split(",").filter(Boolean) ?? [],
      businessWebsite: businessWebsiteParam || businessDomainParam || undefined,
    });

    toast.success("Ödeme başarılı! Kampanya formu dolduruldu.");

    window.history.replaceState(null, "", "/dashboard");
  }, [onCampaignStarted, onResume, searchParams]);

  return null;
}

function DashboardPageContent() {
  const { login } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<AuthViewMode>("register");
  const [pendingCampaign, setPendingCampaign] =
    useState<CampaignFormData | null>(null);
  const [walletRefreshToken, setWalletRefreshToken] = useState(0);
  const [startedCampaignId, setStartedCampaignId] = useState<string | null>(null);

  const handleWalletRefresh = useCallback(() => {
    setWalletRefreshToken((value) => value + 1);
  }, []);

  useEffect(() => {
    if (window.location.hash !== "#campaign-history") {
      return;
    }

    const scrollTarget = () => {
      document
        .getElementById("campaign-history")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const timeoutId = window.setTimeout(scrollTarget, 150);
    return () => window.clearTimeout(timeoutId);
  }, []);

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

  const handleCampaignStarted = useCallback((campaignId: string) => {
    setStartedCampaignId(campaignId);
    setWalletRefreshToken((value) => value + 1);
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
      handleWalletRefresh();
    },
    [handleWalletRefresh, login],
  );

  const handleAuthModalClose = useCallback(() => {
    setShowAuthModal(false);
    setPendingCampaign(null);
  }, []);

  return (
    <div className="dashboard-cyber relative flex min-h-screen flex-col overflow-x-hidden bg-[#050505] text-white">
      <DashboardCyberScene3D />
      <div className="dc-grid-overlay" aria-hidden />
      <PaymentResumeHandler
        onResume={handlePaymentResume}
        onCampaignStarted={handleCampaignStarted}
      />
      <Navbar compactLogo />
      <main className="relative z-10 flex-1">
        <DashboardShell
          pendingCampaign={pendingCampaign}
          onPendingCampaignHandled={handlePendingCampaignHandled}
          onRequireAuth={handleRequireAuth}
          walletRefreshToken={walletRefreshToken}
          onWalletRefresh={handleWalletRefresh}
          startedCampaignId={startedCampaignId}
        />
      </main>
      <CorporateFooter />
      <AuthModal
        isOpen={showAuthModal}
        onClose={handleAuthModalClose}
        onSuccess={handleAuthSuccess}
        onAuthComplete={handleWalletRefresh}
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
