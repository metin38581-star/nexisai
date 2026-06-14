"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { SubscriptionPlanId, UserSession } from "@/types/user";

interface AuthContextValue extends UserSession {
  login: (userName?: string) => void;
  logout: () => void;
  activateSubscription: (plan: SubscriptionPlanId) => void;
}

const defaultSession: UserSession = {
  isLoggedIn: false,
  hasActiveSubscription: false,
  userName: null,
  activePlan: null,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession>(defaultSession);

  const login = useCallback((userName?: string) => {
    setSession((prev) => ({
      ...prev,
      isLoggedIn: true,
      userName: userName?.trim() || "İşletme Hesabı",
    }));
  }, []);

  const logout = useCallback(() => {
    setSession(defaultSession);
  }, []);

  const activateSubscription = useCallback((plan: SubscriptionPlanId) => {
    setSession((prev) => ({
      ...prev,
      isLoggedIn: true,
      hasActiveSubscription: true,
      activePlan: plan,
      userName: prev.userName ?? "İşletme Hesabı",
    }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...session,
      login,
      logout,
      activateSubscription,
    }),
    [session, login, logout, activateSubscription],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth yalnızca AuthProvider içinde kullanılabilir.");
  }
  return context;
}
