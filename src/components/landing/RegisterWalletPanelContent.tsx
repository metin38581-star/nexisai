"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

import BrandLogo from "@/components/brand/BrandLogo";
import {
  DEFAULT_WALLET_TOPUP_TL,
  formatWelcomeBalanceMessage,
} from "@/lib/wallet-constants";
import { OTP_BYPASS_ENABLED } from "@/lib/otp-bypass";
import { useAuth } from "@/context/AuthContext";
import { buildAuthFetchInit } from "@/lib/auth-headers";
import {
  isSupabaseConfigured,
  SUPABASE_SETUP_HINT,
} from "@/lib/supabase-config";
import "@/components/landing/landing-futuristic.css";

const inputClassName =
  "w-full min-h-[44px] rounded-xl border border-violet-500/25 bg-slate-950/50 px-4 py-3 text-base text-white placeholder:text-zinc-600 backdrop-blur-md transition-all focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 focus:shadow-[0_0_20px_rgba(6,182,212,0.15)] sm:text-sm";

interface RegisterWalletPanelContentProps {
  mode: "register" | "wallet";
  onClose: () => void;
  onWalletSuccess?: () => void;
}

export default function RegisterWalletPanelContent({
  mode,
  onClose,
  onWalletSuccess,
}: RegisterWalletPanelContentProps) {
  const router = useRouter();
  const { login, accessToken } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [topUpAmount, setTopUpAmount] = useState(String(DEFAULT_WALLET_TOPUP_TL));
  const [registerStep, setRegisterStep] = useState<"form" | "otp">("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldReveal, setFieldReveal] = useState(0);

  useEffect(() => {
    let frameId = 0;
    const start = performance.now();

    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      const reveal = Math.min(elapsed / 1.2, 1);
      setFieldReveal(reveal);
      if (reveal < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const fieldStyle = (index: number): React.CSSProperties => ({
    opacity: fieldReveal > index * 0.22 ? 1 : 0,
    transform: fieldReveal > index * 0.22 ? "translateY(0)" : "translateY(18px)",
    transition: "opacity 0.55s ease, transform 0.55s ease",
  });

  const validateRegister = (): string | null => {
    if (!fullName.trim()) return "İşletme adı zorunludur.";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return "Geçerli bir e-posta adresi girin.";
    }
    if (password.trim().length < 6) return "Şifre en az 6 karakter olmalıdır.";
    return null;
  };

  const sendOtp = async (): Promise<boolean> => {
    const validationError = validateRegister();
    if (validationError) {
      setErrorMessage(validationError);
      return false;
    }

    setIsSendingOtp(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), purpose: "register" }),
      });
      const result = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !result.success) {
        setErrorMessage(result.error ?? "Doğrulama kodu gönderilemedi.");
        return false;
      }
      toast.success("Doğrulama kodu e-posta adresinize gönderildi.");
      setRegisterStep("otp");
      return true;
    } catch {
      setErrorMessage("Doğrulama kodu gönderilemedi.");
      return false;
    } finally {
      setIsSendingOtp(false);
    }
  };

  const completeRegister = async (): Promise<void> => {
    const validationError = validateRegister();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (!isSupabaseConfigured()) {
      setErrorMessage(`Supabase yapılandırması eksik. ${SUPABASE_SETUP_HINT}`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "register",
          email: email.trim(),
          password: password.trim(),
          companyName: fullName.trim(),
          ...(OTP_BYPASS_ENABLED ? {} : { otpCode: otpCode.trim() }),
        }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
        user?: { id: string; email: string; userName: string };
        accessToken?: string;
        welcomeBalance?: number;
      };

      if (!response.ok || !result.success || !result.user || !result.accessToken) {
        setErrorMessage(result.error ?? "Kayıt tamamlanamadı.");
        return;
      }

      login({
        userName: result.user.userName,
        userEmail: result.user.email,
        userId: result.user.id,
        accessToken: result.accessToken,
      });

      const granted =
        typeof result.welcomeBalance === "number"
          ? `${result.welcomeBalance.toLocaleString("tr-TR")} ₺`
          : formatWelcomeBalanceMessage();
      toast.success(`Hesabınız doğrulandı! ${granted} hediye bakiyeniz tanımlandı. 🎁`);
      onClose();
      router.push("/dashboard");
    } catch {
      setErrorMessage("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (OTP_BYPASS_ENABLED) {
      await completeRegister();
      return;
    }

    if (registerStep === "form") {
      await sendOtp();
      return;
    }

    if (!/^\d{6}$/.test(otpCode.trim())) {
      setErrorMessage("6 haneli doğrulama kodunu girin.");
      return;
    }

    await completeRegister();
  };

  const handleWalletSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        "/api/wallet",
        buildAuthFetchInit(accessToken, {
          method: "POST",
          body: JSON.stringify({ amount: Number(topUpAmount) }),
        }),
      );
      const result = await response.json();

      if (!response.ok) {
        setErrorMessage(result.error ?? "Bakiye yüklenemedi.");
        return;
      }

      if (result.requiresPayment && result.paymentPageUrl) {
        window.location.href = result.paymentPageUrl as string;
        return;
      }

      toast.success("Bakiye başarıyla yüklendi.");
      onWalletSuccess?.();
      onClose();
    } catch {
      setErrorMessage("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRegister = mode === "register";

  return (
    <div className="lf-register-panel-3d relative z-10 mx-auto w-full max-w-md px-3 pb-6 pt-4 sm:px-0 sm:pb-0 sm:pt-0">
      <button
        type="button"
        onClick={onClose}
        className="touch-target absolute right-1 top-1 z-20 flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/90 text-zinc-400 transition hover:text-white sm:-right-2 sm:-top-2 sm:h-9 sm:w-9"
        aria-label="Kapat"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-slate-950/55 p-5 shadow-[0_0_48px_rgba(139,92,246,0.22),0_0_80px_rgba(6,182,212,0.1)] backdrop-blur-xl sm:p-8">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.14),transparent_55%)]"
          aria-hidden
        />

        <div className="relative mb-6 flex justify-center" style={fieldStyle(0)}>
          <BrandLogo className="h-auto w-44 object-contain drop-shadow-[0_0_16px_rgba(139,92,246,0.45)]" />
        </div>

        <div className="relative text-center" style={fieldStyle(0)}>
          <h2 className="lf-orbitron bg-gradient-to-r from-white via-slate-200 to-purple-400 bg-clip-text text-xl font-bold text-transparent">
            {isRegister
              ? "NexisAI Operasyon Merkezine Katılın"
              : "Siber Cüzdan — Bakiye Yükle"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            {isRegister
              ? "Yapay zeka optimizasyon kampanyalarınızı yönetmek ve cüzdanınızı aktif etmek için ücretsiz hesabınızı oluşturun."
              : "Operasyon maliyetinizi karşılamak için cüzdanınıza TL yükleyin."}
          </p>
        </div>

        {isRegister ? (
          <form onSubmit={handleRegisterSubmit} className="relative mt-6 space-y-4">
            <div style={fieldStyle(1)}>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                İşletme Adı
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Örn: Nexis Diş Kliniği"
                disabled={isSubmitting || registerStep === "otp"}
                className={inputClassName}
                autoComplete="organization"
              />
            </div>
            <div style={fieldStyle(2)}>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                E-posta
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@isletme.com"
                disabled={isSubmitting || registerStep === "otp"}
                className={inputClassName}
                autoComplete="email"
              />
            </div>
            <div style={fieldStyle(3)}>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Şifre
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="En az 6 karakter"
                disabled={isSubmitting || registerStep === "otp"}
                className={inputClassName}
                autoComplete="new-password"
              />
            </div>
            {/* OTP adımı — OTP_BYPASS_ENABLED iken gizli; tekrar açmak için bypass'ı kapatın */}
            {!OTP_BYPASS_ENABLED && registerStep === "otp" && (
              <div style={fieldStyle(4)}>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  E-posta Doğrulama Kodu
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="6 haneli kod"
                  disabled={isSubmitting}
                  className={inputClassName}
                  autoComplete="one-time-code"
                />
              </div>
            )}
            {errorMessage ? (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {errorMessage}
              </p>
            ) : null}
            <div style={fieldStyle(4)}>
              <button
                type="submit"
                disabled={isSubmitting || isSendingOtp}
                className="lf-register-btn relative w-full min-h-[48px] overflow-hidden rounded-xl py-3.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                <span className="absolute inset-0 bg-neon-gradient opacity-90" />
                <span className="absolute inset-[1px] rounded-[11px] bg-slate-950/15 backdrop-blur-sm" />
                <span className="relative inline-flex items-center justify-center gap-2">
                  {isSubmitting || isSendingOtp ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {OTP_BYPASS_ENABLED
                        ? "Kaydediliyor..."
                        : registerStep === "otp"
                          ? "Doğrulanıyor..."
                          : "Gönderiliyor..."}
                    </>
                  ) : !OTP_BYPASS_ENABLED && registerStep === "otp" ? (
                    `Doğrula ve ${formatWelcomeBalanceMessage()} Hediye Bakiyeni Al 🎁`
                  ) : (
                    "Doğrulama Kodu Gönder 📧"
                  )}
                </span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleWalletSubmit} className="relative mt-6 space-y-4">
            <div style={fieldStyle(1)}>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Yüklenecek Miktar (₺)
              </label>
              <input
                type="number"
                min={1}
                step={1}
                required
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                className={inputClassName}
              />
            </div>
            {errorMessage ? (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {errorMessage}
              </p>
            ) : null}
            <div style={fieldStyle(2)}>
              <button
                type="submit"
                disabled={isSubmitting}
                className="lf-register-btn relative w-full min-h-[48px] overflow-hidden rounded-xl py-3.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                <span className="absolute inset-0 bg-neon-gradient opacity-90" />
                <span className="absolute inset-[1px] rounded-[11px] bg-slate-950/15 backdrop-blur-sm" />
                <span className="relative">
                  {isSubmitting ? "Yükleniyor..." : "Bakiyeyi Onayla"}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
