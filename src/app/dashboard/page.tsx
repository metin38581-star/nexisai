"use client";

import { useEffect, useState } from "react";
import BackgroundGlow from "@/components/layout/BackgroundGlow";
import Navbar from "@/components/layout/Navbar";
import DashboardShell from "@/components/dashboard/DashboardShell";
import CorporateFooter from "@/components/layout/CorporateFooter";
import AuthModal, { type AuthViewMode } from "@/components/auth/AuthModal";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
  const { isLoggedIn, login } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showApp, setShowApp] = useState(false);
  const [authMode, setAuthMode] = useState<AuthViewMode>("register");

  useEffect(() => {
    if (isLoggedIn) {
      setShowApp(true);
      setShowAuthModal(false);
    } else {
      setShowApp(false);
      setShowAuthModal(true);
    }
  }, [isLoggedIn]);

  const handleAuthSuccess = (userName: string) => {
    login(userName);
    setShowAuthModal(false);
    setShowApp(true);
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-black text-white">
      <BackgroundGlow />
      <Navbar />
      <main className="relative z-10 flex-1">
        {showApp && <DashboardShell />}
      </main>
      <CorporateFooter />
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        authMode={authMode}
        onAuthModeChange={setAuthMode}
      />
    </div>
  );
}
