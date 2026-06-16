"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import AuthModal, { type AuthViewMode } from "@/components/auth/AuthModal";
import NexisLogo from "@/components/brand/NexisLogo";

function AuthNavPlaceholder() {
  return (
    <div
      className="h-10 w-36 animate-pulse rounded-full border border-white/5 bg-zinc-900/40"
      aria-hidden
    />
  );
}

function UserMenu({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string | null;
}) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Link
        href="/dashboard"
        className="hidden rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-200 transition-all hover:border-violet-400/50 hover:bg-violet-500/20 sm:inline-flex"
      >
        Paneli Aç
      </Link>
      <div className="flex max-w-[220px] items-center gap-2.5 rounded-full border border-white/5 bg-zinc-900/50 px-3 py-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-blue-500/30 ring-1 ring-white/10">
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
        <div className="hidden min-w-0 md:block">
          <p className="truncate text-sm font-medium text-zinc-200">{userName}</p>
          {userEmail ? (
            <p className="truncate text-[11px] text-zinc-500">{userEmail}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LoginButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-white/5 bg-zinc-900/50 px-5 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-violet-500/30 hover:bg-zinc-800/60 hover:text-white"
    >
      Giriş Yap
    </button>
  );
}

export default function Navbar() {
  const { isAuthReady, isLoggedIn, userName, userEmail, userId, login } =
    useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthViewMode>("register");

  const openAuthModal = (mode: AuthViewMode = "login") => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const hasActiveSession = isLoggedIn && Boolean(userId);

  return (
    <>
      <header className="relative z-10 border-b border-white/5 bg-zinc-950/60 backdrop-blur-xl">
        <div className="relative mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-6 pt-3 pb-1 lg:px-8 lg:pt-4 lg:pb-2">
          <div aria-hidden />

          <div className="flex justify-center self-start">
            <NexisLogo />
          </div>

          <div className="flex min-h-10 items-center justify-end gap-3">
            {!isAuthReady ? (
              <AuthNavPlaceholder />
            ) : hasActiveSession ? (
              <UserMenu
                userName={userName ?? "İşletme Hesabı"}
                userEmail={userEmail}
              />
            ) : (
              <LoginButton onClick={() => openAuthModal("login")} />
            )}
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(payload) => login(payload)}
        authMode={authMode}
        onAuthModeChange={setAuthMode}
      />
    </>
  );
}
