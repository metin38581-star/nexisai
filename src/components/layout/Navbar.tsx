"use client";

import { useState } from "react";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";
import AuthModal, { type AuthViewMode } from "@/components/auth/AuthModal";
import NexisLogo from "@/components/brand/NexisLogo";

function SupportLink() {
  return (
    <a
      href={`mailto:${SUPPORT_EMAIL}`}
      className="group flex items-center gap-2.5 rounded-full border border-white/5 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-400 transition-all duration-300 hover:border-violet-500/30 hover:bg-zinc-800/60 hover:text-white"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/10 transition-colors group-hover:bg-violet-500/20">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-3.5 w-3.5 text-violet-400"
          aria-hidden
        >
          <path
            d="M4 6h16v12H4V6z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M4 7l8 6 8-6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="hidden sm:inline">{SUPPORT_EMAIL}</span>
      <span className="sm:hidden">Destek</span>
    </a>
  );
}

function ProfileButton({ userName }: { userName: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-full border border-white/5 bg-zinc-900/50 px-3 py-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-blue-500/30 ring-1 ring-white/10">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-4 w-4 text-violet-300"
          aria-hidden
        >
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M5 20c0-4 3.5-6 7-6s7 2 7 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="hidden max-w-[120px] truncate text-sm text-zinc-300 md:inline">
        {userName}
      </span>
    </div>
  );
}

export default function Navbar() {
  const { isLoggedIn, userName, login } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthViewMode>("register");

  const openAuthModal = (mode: AuthViewMode = "register") => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <>
      <header className="relative z-10 border-b border-white/5 bg-zinc-950/60 backdrop-blur-xl">
        <div className="relative mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-6 pt-3 pb-1 lg:px-8 lg:pt-4 lg:pb-2">
          <div aria-hidden />

          <div className="flex justify-center self-start">
            <NexisLogo />
          </div>

          <div className="flex items-center justify-end gap-3">
            {isLoggedIn ? (
              <>
                <ProfileButton userName={userName ?? "İşletme Hesabı"} />
                <SupportLink />
              </>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal("register")}
                className="rounded-full border border-white/5 bg-zinc-900/50 px-5 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-violet-500/30 hover:bg-zinc-800/60 hover:text-white"
              >
                Giriş Yap / Kayıt Ol
              </button>
            )}
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(name) => login(name)}
        authMode={authMode}
        onAuthModeChange={setAuthMode}
      />
    </>
  );
}
