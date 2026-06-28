"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ChevronDown,
  CreditCard,
  LogOut,
  MessageCircle,
  Shield,
  UserRound,
} from "lucide-react";

import BalanceHistoryModal from "@/components/wallet/BalanceHistoryModal";
import SupportModal from "@/components/support/SupportModal";
import { useAuth } from "@/context/AuthContext";
import { isDashboardPath } from "@/lib/auth-client-flow";

interface UserProfileDropdownProps {
  userName: string;
  userEmail: string | null;
  showAdminLink: boolean;
}

const MENU_ITEM_CLASS =
  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-violet-100 transition-colors duration-200 hover:bg-violet-500/10 hover:text-white";

function scrollToCampaignHistory(): void {
  document
    .getElementById("campaign-history")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function UserProfileDropdown({
  userName,
  userEmail,
  showAdminLink,
}: UserProfileDropdownProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, accessToken } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isBalanceHistoryOpen, setIsBalanceHistoryOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleCampaignHistory = () => {
    setIsOpen(false);

    if (isDashboardPath(pathname)) {
      scrollToCampaignHistory();
      return;
    }

    router.push("/dashboard#campaign-history");
  };

  const handleBalanceHistory = () => {
    setIsOpen(false);
    setIsBalanceHistoryOpen(true);
  };

  const handleSupport = () => {
    setIsOpen(false);
    setIsSupportOpen(true);
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    router.push("/");
  };

  return (
    <>
      <div ref={containerRef} className="relative flex items-center gap-2 sm:gap-3">
        {showAdminLink ? (
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-500/40 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 px-4 py-2 text-sm font-semibold text-fuchsia-200 shadow-[0_0_18px_rgba(168,85,247,0.25)] transition-all duration-300 hover:border-fuchsia-400/60 hover:from-violet-500/30 hover:to-fuchsia-500/30 hover:text-white hover:shadow-[0_0_28px_rgba(168,85,247,0.4)]"
          >
            <Shield className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Admin Dashboard</span>
            <span className="sm:hidden">Admin</span>
          </Link>
        ) : null}

        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="flex max-w-[240px] items-center gap-2.5 rounded-full border border-violet-500/25 bg-zinc-900/60 px-3 py-2 backdrop-blur-sm transition-all duration-200 hover:border-violet-400/50 hover:bg-zinc-900/80 hover:shadow-[0_0_24px_rgba(139,92,246,0.25)]"
          aria-expanded={isOpen}
          aria-haspopup="menu"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-blue-500/30 ring-1 ring-violet-400/20">
            <UserRound className="h-4 w-4 text-violet-300" aria-hidden />
          </span>
          <div className="hidden min-w-0 text-left md:block">
            <p className="truncate text-sm font-medium text-zinc-200">{userName}</p>
            {userEmail ? (
              <p className="truncate text-[11px] text-zinc-500">{userEmail}</p>
            ) : null}
          </div>
          <ChevronDown
            className={`hidden h-4 w-4 shrink-0 text-violet-300 transition-transform duration-200 md:block ${isOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>

        {isOpen ? (
          <div
            className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-violet-500/25 bg-zinc-950/90 p-2 shadow-[0_0_32px_rgba(139,92,246,0.28)] backdrop-blur-xl"
            role="menu"
          >
            <div className="border-b border-white/5 px-3 py-2.5 md:hidden">
              <p className="truncate text-sm font-medium text-zinc-200">{userName}</p>
              {userEmail ? (
                <p className="truncate text-[11px] text-zinc-500">{userEmail}</p>
              ) : null}
            </div>

            <div className="py-1">
              <button
                type="button"
                role="menuitem"
                onClick={handleCampaignHistory}
                className={MENU_ITEM_CLASS}
              >
                <BarChart3 className="h-4 w-4 shrink-0 text-violet-300" />
                Geçmiş Kampanyalar
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleBalanceHistory}
                className={MENU_ITEM_CLASS}
              >
                <CreditCard className="h-4 w-4 shrink-0 text-violet-300" />
                Bakiye Geçmişi
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleSupport}
                className={MENU_ITEM_CLASS}
              >
                <MessageCircle className="h-4 w-4 shrink-0 text-violet-300" />
                Destek
              </button>
            </div>

            <div className="border-t border-white/5 pt-1">
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-300 transition-colors duration-200 hover:bg-red-500/10 hover:text-red-200"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Çıkış Yap
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <BalanceHistoryModal
        isOpen={isBalanceHistoryOpen}
        onClose={() => setIsBalanceHistoryOpen(false)}
        accessToken={accessToken}
      />
      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />
    </>
  );
}
