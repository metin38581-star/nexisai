"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Shield } from "lucide-react";

import BackgroundGlow from "@/components/layout/BackgroundGlow";
import { ADMIN_DASHBOARD_PATH } from "@/lib/admin-routes";

const inputClass =
  "w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-white placeholder:text-zinc-600 transition focus:border-violet-500/40 focus:outline-none focus:ring-1 focus:ring-violet-500/20";

interface AdminLoginClientProps {
  authReadiness: {
    passwordConfigured: boolean;
    secretConfigured: boolean;
    isReady: boolean;
  };
}

function resolveAuthSetupError(authReadiness: AdminLoginClientProps["authReadiness"]): string | null {
  if (authReadiness.isReady) {
    return null;
  }

  if (!authReadiness.passwordConfigured) {
    return "Admin girişi sunucuda yapılandırılmamış. ADMIN_STANDALONE_PASSWORD tanımlayın.";
  }

  if (!authReadiness.secretConfigured) {
    return "Admin oturum imzası yapılandırılmamış. ADMIN_STANDALONE_SECRET tanımlayın.";
  }

  return "Admin girişi şu an kullanılamıyor.";
}

export default function AdminLoginClient({ authReadiness }: AdminLoginClientProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const setupError = resolveAuthSetupError(authReadiness);
  const authEnabled = authReadiness.isReady;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!authEnabled) {
      setError(setupError ?? "Admin girişi şu an kullanılamıyor.");
      return;
    }

    if (!password.trim()) {
      setError("Admin şifresi zorunludur.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/standalone-auth", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Giriş başarısız.");
        return;
      }

      router.replace(ADMIN_DASHBOARD_PATH);
      router.refresh();
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <BackgroundGlow />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-500/30 bg-violet-500/10">
            <Shield className="h-7 w-7 text-violet-300" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-400">
            NexisAI SuperAdmin
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">
            Admin Girişi
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Merkezi veri paneline erişmek için admin şifrenizi girin.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass-card border border-violet-500/20 p-8"
        >
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Admin Şifresi
          </label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
            placeholder="••••••••••"
            autoComplete="current-password"
            autoFocus
            disabled={!authEnabled || submitting}
          />

          {setupError ? (
            <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              {setupError}
            </p>
          ) : null}

          {error ? (
            <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!authEnabled || submitting || !password.trim()}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Doğrulanıyor...
              </>
            ) : (
              "Giriş Yap"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
