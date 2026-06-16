"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import BrandLogo from "@/components/brand/BrandLogo";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
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
  }) => void;
  authMode: AuthViewMode;
  onAuthModeChange: (mode: AuthViewMode) => void;
}

const AUTH_TIMEOUT_MS = 10_000;
const AUTH_TIMEOUT_ERROR = "AUTH_TIMEOUT";

const inputClassName =
  "w-full rounded-xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-zinc-600 backdrop-blur-sm transition-colors focus:border-violet-500/40 focus:outline-none focus:ring-1 focus:ring-violet-500/25";

async function withAuthTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error(AUTH_TIMEOUT_ERROR));
      }, AUTH_TIMEOUT_MS);
    }),
  ]);
}

function isServerSideAuthError(status?: number): boolean {
  return typeof status === "number" && status >= 500;
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  authMode,
  onAuthModeChange,
}: AuthModalProps) {
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

    if (trimmedPassword.length < 6) {
      return "Şifre en az 6 karakter olmalıdır.";
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
      const supabase = getSupabaseBrowser();
      const authResult = await withAuthTimeout(
        isRegister
          ? supabase.auth.signUp({
              email: email.trim(),
              password: password.trim(),
              options: {
                data: {
                  full_name: fullName.trim(),
                  company_name: fullName.trim(),
                },
              },
            })
          : supabase.auth.signInWithPassword({
              email: email.trim(),
              password: password.trim(),
            }),
      );

      if (authResult.error) {
        if (isServerSideAuthError(authResult.error.status)) {
          toast.error("Sistem şu an yoğun, lütfen tekrar deneyin");
        } else {
          setErrorMessage(authResult.error.message);
        }
        return;
      }

      const activeSession = authResult.data.session;
      const user = authResult.data.user ?? activeSession?.user;

      if (!user || !activeSession?.access_token) {
        setErrorMessage(
          isRegister
            ? "Kayıt oluşturuldu. E-posta doğrulaması sonrası giriş yapabilirsiniz."
            : "Oturum başlatılamadı. Lütfen tekrar deneyin.",
        );
        return;
      }

      const displayName =
        fullName.trim() ||
        (typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : "") ||
        email.split("@")[0]?.trim() ||
        "İşletme Hesabı";

      if (isRegister) {
        toast.success(
          "Hesabınız başarıyla oluşturuldu! Panele yönlendiriliyorsunuz... 🚀",
        );
      }

      onSuccess({
        userName: displayName,
        userEmail: user.email?.trim() || email.trim() || null,
        userId: user.id,
        accessToken: activeSession.access_token,
      });
      setFullName("");
      setEmail("");
      setPassword("");
    } catch (error) {
      const isTimeout =
        error instanceof Error && error.message === AUTH_TIMEOUT_ERROR;

      if (isTimeout) {
        toast.error("Sistem şu an yoğun, lütfen tekrar deneyin");
        setErrorMessage("İstek zaman aşımına uğradı. Lütfen tekrar deneyin.");
        return;
      }

      toast.error("Sistem şu an yoğun, lütfen tekrar deneyin");
      const message =
        error instanceof Error
          ? error.message
          : "Supabase oturum servisine bağlanılamadı.";
      setErrorMessage(message);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />

      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/80 p-8 shadow-[0_0_60px_rgba(139,92,246,0.15)] backdrop-blur-xl"
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
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 text-sm text-zinc-500 transition-colors hover:border-slate-700 hover:text-white"
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
            className="bg-gradient-to-r from-white via-slate-200 to-purple-400 bg-clip-text pr-8 text-2xl font-bold text-transparent"
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
                placeholder="En az 6 karakter"
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
              className="group relative mt-2 w-full overflow-hidden rounded-xl py-3.5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="absolute inset-0 bg-neon-gradient opacity-90 transition-opacity group-hover:opacity-100 group-disabled:opacity-70" />
              <span className="absolute inset-[1px] rounded-[11px] bg-slate-950/10" />
              <span className="relative inline-flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isRegister ? "Kayıt Yapılıyor..." : "Giriş Yapılıyor..."}
                  </>
                ) : isRegister ? (
                  "Hesabımı Oluştur ve Paneli Aç 🚀"
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
