"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import BrandLogo from "@/components/brand/BrandLogo";
import { getLandingParallax } from "@/lib/landing-parallax";
import {
  isSupabaseConfigured,
  SUPABASE_SETUP_HINT,
} from "@/lib/supabase-config";

const inputClassName =
  "w-full rounded-xl border border-violet-500/25 bg-slate-950/50 px-4 py-3 text-sm text-white placeholder:text-zinc-600 backdrop-blur-md transition-all focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 focus:shadow-[0_0_20px_rgba(6,182,212,0.15)]";

export default function LandingRegisterPanel3D() {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [registerStep, setRegisterStep] = useState<"form" | "otp">("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldReveal, setFieldReveal] = useState(0);

  useEffect(() => {
    let frameId = 0;
    const start = performance.now();

    const tick = () => {
      const { x, y } = getLandingParallax();
      if (panelRef.current) {
        panelRef.current.style.transform = [
          "perspective(900px)",
          `rotateY(${x * 10}deg)`,
          `rotateX(${-y * 7}deg)`,
          "translateZ(0)",
        ].join(" ");
      }

      const elapsed = (performance.now() - start) / 1000;
      setFieldReveal(Math.min(elapsed / 1.2, 1));
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const validateForm = (): string | null => {
    if (!fullName.trim()) return "İşletme adı zorunludur.";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return "Geçerli bir e-posta adresi girin.";
    }
    if (password.trim().length < 6) return "Şifre en az 6 karakter olmalıdır.";
    return null;
  };

  const sendOtp = async (): Promise<boolean> => {
    const validationError = validateForm();
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

  const completeRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (registerStep === "form") {
      await sendOtp();
      return;
    }

    if (!/^\d{6}$/.test(otpCode.trim())) {
      setErrorMessage("6 haneli doğrulama kodunu girin.");
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
          otpCode: otpCode.trim(),
        }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
        accessToken?: string;
      };

      if (!response.ok || !result.success) {
        setErrorMessage(result.error ?? "Kayıt tamamlanamadı.");
        return;
      }

      toast.success("Hesabınız doğrulandı! 100 ₺ hediye bakiyeniz tanımlandı. 🎁");
      router.push("/dashboard");
    } catch {
      setErrorMessage("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldStyle = (index: number): React.CSSProperties => ({
    opacity: fieldReveal > index * 0.22 ? 1 : 0,
    transform:
      fieldReveal > index * 0.22
        ? "translateY(0)"
        : "translateY(18px)",
    transition: "opacity 0.55s ease, transform 0.55s ease",
  });

  return (
    <div className="relative flex min-h-[520px] items-center justify-center [perspective:900px]">
      <div
        ref={panelRef}
        className="lf-register-panel-3d w-full max-w-md will-change-transform"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-slate-950/45 p-8 shadow-[0_0_48px_rgba(139,92,246,0.18),0_0_80px_rgba(6,182,212,0.08)] backdrop-blur-xl">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.12),transparent_55%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl"
            aria-hidden
          />

          <div className="relative mb-6 flex justify-center" style={fieldStyle(0)}>
            <BrandLogo className="h-auto w-48 object-contain drop-shadow-[0_0_16px_rgba(139,92,246,0.45)]" />
          </div>

          <div className="relative text-center" style={fieldStyle(0)}>
            <h2 className="lf-orbitron bg-gradient-to-r from-white via-slate-200 to-purple-400 bg-clip-text text-xl font-bold text-transparent sm:text-2xl">
              NexisAI Operasyon Merkezine Katılın
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Yapay zeka optimizasyon kampanyalarınızı yönetmek ve cüzdanınızı
              aktif etmek için ücretsiz hesabınızı oluşturun.
            </p>
          </div>

          <form onSubmit={completeRegister} className="relative mt-6 space-y-4">
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

            {registerStep === "otp" && (
              <div style={fieldStyle(4)}>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  E-posta Doğrulama Kodu
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) =>
                    setOtpCode(e.target.value.replace(/\D/g, ""))
                  }
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
                className="lf-register-btn relative w-full overflow-hidden rounded-xl py-3.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                <span className="absolute inset-0 bg-neon-gradient opacity-90" />
                <span className="absolute inset-[1px] rounded-[11px] bg-slate-950/15 backdrop-blur-sm" />
                <span className="relative inline-flex items-center justify-center gap-2">
                  {isSubmitting || isSendingOtp ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {registerStep === "otp" ? "Doğrulanıyor..." : "Gönderiliyor..."}
                    </>
                  ) : registerStep === "otp" ? (
                    "Doğrula ve 100 ₺ Hediye Bakiyeni Al 🎁"
                  ) : (
                    "Doğrulama Kodu Gönder 📧"
                  )}
                </span>
              </button>
            </div>
          </form>

          <p className="relative mt-5 text-center text-sm text-zinc-500">
            Zaten hesabınız var mı?{" "}
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="font-medium text-violet-400 transition hover:text-violet-300"
            >
              Giriş Yap
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
