"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { isAdminEmailClient } from "@/lib/admin-emails";
import AuthModal, { type AuthViewMode } from "@/components/auth/AuthModal";
import NexisLogo from "@/components/brand/NexisLogo";
import UserProfileDropdown from "@/components/layout/UserProfileDropdown";

const AUTH_BUTTON_CLASS =
  "rounded-full border border-violet-500/35 bg-zinc-900/60 px-5 py-2.5 text-sm font-semibold text-zinc-200 backdrop-blur-sm transition-all duration-300 hover:border-violet-400/70 hover:bg-zinc-800/70 hover:text-white hover:shadow-[0_0_24px_rgba(139,92,246,0.45),0_0_48px_rgba(59,130,246,0.15)]";

function AuthNavButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={AUTH_BUTTON_CLASS}>
      Kayıt Ol / Giriş Yap
    </button>
  );
}

interface NavbarProps {
  compactLogo?: boolean;
}

export default function Navbar({ compactLogo = false }: NavbarProps) {
  const { isAuthReady, isLoggedIn, userName, userEmail, userId, login } =
    useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthViewMode>("register");

  const openAuthModal = (mode: AuthViewMode = "register") => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const hasActiveSession = isLoggedIn && Boolean(userId);
  const showAdminLink =
    isAuthReady && hasActiveSession && isAdminEmailClient(userEmail);

  return (
    <>
      <header className="relative z-[100] border-b border-white/5 bg-zinc-950/60 backdrop-blur-xl">
        <div className="relative mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-4 pt-1 pb-0.5 sm:px-6 lg:px-8 lg:pt-1.5 lg:pb-1">
          <div aria-hidden />

          <div className="flex justify-center self-start">
            <NexisLogo size={compactLogo ? "compact" : "default"} />
          </div>

          <div className="relative z-[100] flex min-h-10 items-center justify-end gap-3">
            {hasActiveSession ? (
              <UserProfileDropdown
                userName={userName ?? "İşletme Hesabı"}
                userEmail={userEmail}
                showAdminLink={showAdminLink}
              />
            ) : (
              <AuthNavButton onClick={() => openAuthModal("register")} />
            )}
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(payload) => {
          login(payload);
          setIsAuthModalOpen(false);
        }}
        authMode={authMode}
        onAuthModeChange={setAuthMode}
      />
    </>
  );
}
