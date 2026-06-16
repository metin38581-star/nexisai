"use client";

import { useEffect, useState } from "react";
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

const inputClassName =
  "w-full rounded-xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-zinc-600 backdrop-blur-sm transition-colors focus:border-violet-500/40 focus:outline-none focus:ring-1 focus:ring-violet-500/25";

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

  useEffect(() => {
    if (!isOpen) {
      setFullName("");
      setEmail("");
      setPassword("");
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const supabaseReady = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    if (!supabaseReady) {
      setErrorMessage(
        `Supabase anahtarları tanımlı değil. ${SUPABASE_SETUP_HINT}`,
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const supabase = getSupabaseBrowser();
      const authResult = isRegister
        ? await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                full_name: fullName.trim(),
              },
            },
          })
        : await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

      if (authResult.error) {
        setErrorMessage(authResult.error.message);
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
      const message =
        error instanceof Error
          ? error.message
          : "Supabase oturum servisine bağlanılamadı.";
      setErrorMessage(message);
    } finally {
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
                  Ad Soyad
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Örn: Ahmet Yılmaz"
                  required
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
                required
                placeholder="ornek@isletme.com"
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
                required
                minLength={6}
                placeholder="En az 6 karakter"
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
              className="group relative mt-2 w-full overflow-hidden rounded-xl py-3.5 text-sm font-semibold text-white transition-all disabled:opacity-60"
            >
              <span className="absolute inset-0 bg-neon-gradient opacity-90 transition-opacity group-hover:opacity-100" />
              <span className="absolute inset-[1px] rounded-[11px] bg-slate-950/10" />
              <span className="relative">
                {isSubmitting
                  ? "Bağlanıyor..."
                  : isRegister
                    ? "Hesabımı Oluştur ve Paneli Aç 🚀"
                    : "Giriş Yap ve Paneli Aç 🔐"}
              </span>
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-zinc-500">
            {isRegister ? (
              <>
                Zaten bir hesabınız var mı?{" "}
                <button
                  type="button"
                  onClick={() => onAuthModeChange("login")}
                  className="font-medium text-violet-400 transition-colors hover:text-violet-300"
                >
                  Giriş Yap
                </button>
              </>
            ) : (
              <>
                Henüz hesabınız yok mu?{" "}
                <button
                  type="button"
                  onClick={() => onAuthModeChange("register")}
                  className="font-medium text-violet-400 transition-colors hover:text-violet-300"
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
