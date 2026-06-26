"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import BrandLogo from "@/components/brand/BrandLogo";
import { formatWelcomeBalanceMessage } from "@/lib/wallet-constants";
import {
  isSupabaseConfigured,
  SUPABASE_SETUP_HINT,
} from "@/lib/supabase-config";

export type AuthViewMode = "register" | "login";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (payload: {
    userName: string;
    userEmail: string | null;
    userId: string;
    accessToken: string;
    refreshToken?: string;
  }) => void;
  authMode: AuthViewMode;
  onAuthModeChange: (mode: AuthViewMode) => void;
}

const AUTH_TIMEOUT_MS = 30_000;
const AUTH_TIMEOUT_ERROR = "AUTH_TIMEOUT";

const inputClassName =
  "w-full min-h-[44px] rounded-xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-base text-white placeholder:text-zinc-600 backdrop-blur-sm transition-colors focus:border-violet-500/40 focus:outline-none focus:ring-1 focus:ring-violet-500/25 sm:text-sm";

interface AuthSessionResponse {
  success?: boolean;
  error?: string;
  requiresEmailConfirmation?: boolean;
  message?: string;
  user?: {
    id: string;
    email: string;
    userName: string;
  };
  accessToken?: string;
  refreshToken?: string;
  welcomeBalance?: number;
}

async function requestAuthSession(
  payload: {
    action: "register" | "login";
    email: string;
    password: string;
    companyName?: string;
  },
  signal: AbortSignal,
): Promise<AuthSessionResponse> {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
    signal,
  });

  const result = (await response.json()) as AuthSessionResponse;

  if (!response.ok) {
    if (response.status >= 500) {
      throw new Error("SERVER_ERROR");
    }

    return {
      success: false,
      error: result.error ?? "Oturum işlemi başarısız oldu.",
    };
  }

  return result;
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  authMode,
  onAuthModeChange,
}: AuthModalProps) {
  const router = useRouter();
  const isRegister = authMode === "register";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      setFullName("");
      setEmail("");
      setPassword("");
      setErrorMessage(null);
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const supabaseReady = isSupabaseConfigured();

  const validateForm = (): string | null => {
    const trimmedCompanyName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (isRegister && !trimmedCompanyName) {
      return "İşletme adı zorunludur.";
    }

    if (!trimmedEmail) {
      return "E-posta adresi zorunludur.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return "Geçerli bir e-posta adresi girin.";
    }

    if (!trimmedPassword) {
      return "Şifre alanı zorunludur.";
    }

    if (trimmedPassword.length < 8) {
      return "Şifre en az 8 karakter olmalıdır.";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting || submittingRef.current) {
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    if (!supabaseReady) {
      setErrorMessage(
        `Supabase anahtarları tanımlı değil. ${SUPABASE_SETUP_HINT}`,
      );
      submittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => {
        controller.abort();
      }, AUTH_TIMEOUT_MS);

      let authResult: AuthSessionResponse;

      try {
        authResult = await requestAuthSession(
          {
            action: isRegister ? "register" : "login",
            email: email.trim(),
            password: password.trim(),
            ...(isRegister ? { companyName: fullName.trim() } : {}),
          },
          controller.signal,
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw new Error(AUTH_TIMEOUT_ERROR);
        }
        throw error;
      } finally {
        window.clearTimeout(timeoutId);
      }

      if (!authResult.success) {
        setErrorMessage(authResult.error ?? "Oturum işlemi başarısız oldu.");
        return;
      }

      if (authResult.requiresEmailConfirmation) {
        toast.success(
          authResult.message ??
            "Kayıt oluşturuldu. E-posta doğrulaması sonrası giriş yapabilirsiniz.",
        );
        setErrorMessage(
          authResult.message ??
            "Kayıt oluşturuldu. E-posta doğrulaması sonrası giriş yapabilirsiniz.",
        );
        return;
      }
      const user = authResult.user;
      const accessToken = authResult.accessToken;

      if (!user?.id || !accessToken) {
        setErrorMessage("Oturum başlatılamadı. Lütfen tekrar deneyin.");
        return;
      }

      if (isRegister) {
        if (
          typeof authResult.welcomeBalance === "number" &&
          authResult.welcomeBalance > 0
        ) {
          toast.success(
            `Hesabınız oluşturuldu! ${authResult.welcomeBalance.toLocaleString("tr-TR")} ₺ hediye bakiyeniz tanımlandı. 🎁`,
          );
        } else {
          toast.success("Hesabınız oluşturuldu! Hoş geldiniz. 🎁");
        }
        router.push("/dashboard");
      }

      onSuccess({
        userName: user.userName,
        userEmail: user.email?.trim() || email.trim() || null,
        userId: user.id,
        accessToken,
        refreshToken: authResult.refreshToken,
      });
      setFullName("");
      setEmail("");
      setPassword("");
    } catch (error) {
      const isTimeout =
        error instanceof Error && error.message === AUTH_TIMEOUT_ERROR;
      const isAbort =
        error instanceof DOMException && error.name === "AbortError";

      if (isTimeout || isAbort) {
        toast.error("Sistem şu an yoğun, lütfen tekrar deneyin");
        setErrorMessage(
          "Kimlik doğrulama sunucusuna ulaşılamadı. Lütfen birkaç saniye sonra tekrar deneyin.",
        );
        return;
      }

      if (error instanceof Error && error.message === "SERVER_ERROR") {
        toast.error("Sistem şu an yoğun, lütfen tekrar deneyin");
        setErrorMessage("Sunucu geçici olarak yanıt vermiyor.");
        return;
      }

      toast.error("Sistem şu an yoğun, lütfen tekrar deneyin");
      const message =
        error instanceof Error
          ? error.message
          : "Oturum servisine bağlanılamadı.";
      setErrorMessage(message);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4">
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />

      <div
        className="relative my-auto w-full max-w-md max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-2xl border border-slate-800/80 bg-slate-950/80 p-5 shadow-[0_0_60px_rgba(139,92,246,0.15)] backdrop-blur-xl sm:max-h-none sm:rounded-2xl sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.12),transparent_55%)]"
          aria-hidden
        />

        <button
          type="button"
          onClick={onClose}
          className="touch-target absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 text-sm text-zinc-500 transition-colors hover:border-slate-700 hover:text-white sm:right-4 sm:top-4 sm:h-8 sm:w-8"
          aria-label="Kapat"
        >
          ✕
        </button>

        <div className="relative">
          <div className="mb-6 flex justify-center">
            <BrandLogo className="mx-auto block h-auto w-56 object-contain object-top -mb-8 sm:w-64 sm:-mb-10" />
          </div>

          <h2
            id="auth-modal-title"
            className="bg-gradient-to-r from-white via-slate-200 to-purple-400 bg-clip-text pr-10 text-xl font-bold text-transparent sm:pr-8 sm:text-2xl"
          >
            {isRegister
              ? "NexisAI Operasyon Merkezine Katılın"
              : "Operasyon Merkezine Giriş Yapın"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            {isRegister
              ? "Yapay zeka optimizasyon kampanyalarınızı yönetmek ve cüzdanınızı aktif etmek için ücretsiz hesabınızı oluşturun."
              : "Mevcut hesabınızla operasyon merkezine ve canlı analiz terminaline erişin."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isRegister && (
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  İşletme Adı
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Örn: Nexis Diş Kliniği"
                  disabled={isSubmitting}
                  autoComplete="organization"
                  className={inputClassName}
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                E-posta
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                placeholder="ornek@isletme.com"
                autoComplete="email"
                className={inputClassName}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Şifre
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                placeholder="En az 8 karakter"
                autoComplete={isRegister ? "new-password" : "current-password"}
                className={inputClassName}
              />
            </div>

            {errorMessage ? (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {errorMessage}
              </p>
            ) : !supabaseReady ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                Supabase Auth yapılandırması eksik. {SUPABASE_SETUP_HINT}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="group relative mt-2 w-full min-h-[48px] overflow-hidden rounded-xl py-3.5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="absolute inset-0 bg-neon-gradient opacity-90 transition-opacity group-hover:opacity-100 group-disabled:opacity-70" />
              <span className="absolute inset-[1px] rounded-[11px] bg-slate-950/10" />
              <span className="relative inline-flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isRegister ? "Kaydediliyor..." : "Giriş Yapılıyor..."}
                  </>
                ) : isRegister ? (
                  `Kayıt Ol ve ${formatWelcomeBalanceMessage()} Hediye Bakiyeni Al 🎁`
                ) : (
                  "Giriş Yap ve Paneli Aç 🔐"
                )}
              </span>
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-zinc-500">
            {isRegister ? (
              <>
                Zaten bir hesabınız var mı?{" "}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => onAuthModeChange("login")}
                  className="font-medium text-violet-400 transition-colors hover:text-violet-300 disabled:opacity-50"
                >
                  Giriş Yap
                </button>
              </>
            ) : (
              <>
                Henüz hesabınız yok mu?{" "}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => onAuthModeChange("register")}
                  className="font-medium text-violet-400 transition-colors hover:text-violet-300 disabled:opacity-50"
                >
                  Kayıt Ol
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
