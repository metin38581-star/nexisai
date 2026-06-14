"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { SubscriptionPlanId, UserSession } from "@/types/user";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

interface AuthLoginPayload {
  userName: string;
  userId: string;
  accessToken: string;
}

interface AuthContextValue extends UserSession {
  login: (payload: AuthLoginPayload) => void;
  logout: () => void;
  activateSubscription: (plan: SubscriptionPlanId) => void;
}

const defaultSession: UserSession = {
  isLoggedIn: false,
  hasActiveSubscription: false,
  userName: null,
  userId: null,
  accessToken: null,
  activePlan: null,
  isAuthReady: false,
};

const AuthContext = createContext<AuthContextValue | null>(null);

function resolveUserName(
  metadata: Record<string, unknown> | undefined,
  email: string | undefined,
): string {
  const fullName = metadata?.full_name;
  if (typeof fullName === "string" && fullName.trim()) {
    return fullName.trim();
  }

  const name = metadata?.name;
  if (typeof name === "string" && name.trim()) {
    return name.trim();
  }

  const emailPrefix = email?.split("@")[0]?.trim();
  return emailPrefix || "İşletme Hesabı";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession>(defaultSession);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    try {
      const supabase = getSupabaseBrowser();

      void supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
        if (!isMounted) {
          return;
        }

        if (!activeSession?.user) {
          setSession((prev) => ({ ...prev, isAuthReady: true }));
          return;
        }

        setSession((prev) => ({
          ...prev,
          isLoggedIn: true,
          userId: activeSession.user.id,
          accessToken: activeSession.access_token,
          userName: resolveUserName(
            activeSession.user.user_metadata,
            activeSession.user.email,
          ),
          isAuthReady: true,
        }));
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, activeSession) => {
        if (!isMounted) {
          return;
        }

        if (!activeSession?.user) {
          setSession({ ...defaultSession, isAuthReady: true });
          return;
        }

        setSession((prev) => ({
          ...prev,
          isLoggedIn: true,
          userId: activeSession.user.id,
          accessToken: activeSession.access_token,
          userName: resolveUserName(
            activeSession.user.user_metadata,
            activeSession.user.email,
          ),
          hasActiveSubscription: prev.hasActiveSubscription,
          activePlan: prev.activePlan,
          isAuthReady: true,
        }));
      });

      unsubscribe = () => subscription.unsubscribe();
    } catch {
      if (isMounted) {
        setSession((prev) => ({ ...prev, isAuthReady: true }));
      }
    }

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  const login = useCallback((payload: AuthLoginPayload) => {
    setSession((prev) => ({
      ...prev,
      isLoggedIn: true,
      userName: payload.userName,
      userId: payload.userId,
      accessToken: payload.accessToken,
      isAuthReady: true,
    }));
  }, []);

  const logout = useCallback(() => {
    try {
      const supabase = getSupabaseBrowser();
      void supabase.auth.signOut();
    } catch {
      // Supabase yapılandırması yoksa yalnızca yerel oturumu kapat.
    }

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
