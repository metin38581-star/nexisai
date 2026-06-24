"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import type { SubscriptionPlanId, UserSession } from "@/types/user";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { syncSupabaseBrowserSession } from "@/lib/sync-supabase-browser-session";

interface AuthLoginPayload {
  userName: string;
  userEmail: string | null;
  userId: string;
  accessToken: string;
  refreshToken?: string | null;
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
  userEmail: null,
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

function resolveUserEmail(email: string | undefined): string | null {
  const normalized = email?.trim();
  return normalized ? normalized : null;
}

function buildSessionFromUser(
  user: User,
  accessToken: string,
  previous: UserSession,
): UserSession {
  return {
    ...previous,
    isLoggedIn: true,
    userId: user.id,
    accessToken,
    userName: resolveUserName(user.user_metadata, user.email),
    userEmail: resolveUserEmail(user.email),
    isAuthReady: true,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession>(defaultSession);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    const syncSession = async () => {
      try {
        const supabase = getSupabaseBrowser();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!isMounted) {
          return;
        }

        if (userError || !user) {
          setSession({ ...defaultSession, isAuthReady: true });
          return;
        }

        const {
          data: { session: activeSession },
        } = await supabase.auth.getSession();

        if (!activeSession?.access_token) {
          setSession({ ...defaultSession, isAuthReady: true });
          return;
        }

        setSession((prev) =>
          buildSessionFromUser(user, activeSession.access_token, prev),
        );
      } catch {
        if (isMounted) {
          setSession({ ...defaultSession, isAuthReady: true });
        }
      }
    };

    try {
      const supabase = getSupabaseBrowser();
      void syncSession();

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, activeSession) => {
        if (!isMounted) {
          return;
        }

        if (!activeSession?.user) {
          setSession({ ...defaultSession, isAuthReady: true });
          return;
        }

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          setSession({ ...defaultSession, isAuthReady: true });
          return;
        }

        setSession((prev) =>
          buildSessionFromUser(user, activeSession.access_token, {
            ...prev,
            hasActiveSubscription: prev.hasActiveSubscription,
            activePlan: prev.activePlan,
          }),
        );
      });

      unsubscribe = () => subscription.unsubscribe();
    } catch {
      if (isMounted) {
        setSession({ ...defaultSession, isAuthReady: true });
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
      userEmail: payload.userEmail,
      userId: payload.userId,
      accessToken: payload.accessToken,
      isAuthReady: true,
    }));
    void syncSupabaseBrowserSession(payload.accessToken, payload.refreshToken);
  }, []);

  const logout = useCallback(() => {
    try {
      const supabase = getSupabaseBrowser();
      void supabase.auth.signOut();
    } catch {
      // Supabase yapılandırması yoksa yalnızca yerel oturumu kapat.
    }

    setSession({ ...defaultSession, isAuthReady: true });
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
