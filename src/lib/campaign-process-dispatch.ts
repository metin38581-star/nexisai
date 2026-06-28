import "server-only";

import { after } from "next/server";

import type { CampaignBackgroundJobInput } from "@/lib/campaign-background-processor";
import { processCampaignInBackground } from "@/lib/campaign-background-processor";
import { resolveInternalJobSecret } from "@/lib/internal-job-auth";
import {
  resolveSiteOrigin,
  resolveSiteOriginFromRequest,
} from "@/lib/site-origin";

function resolveInternalProcessUrl(request?: Request): string {
  const origin = request
    ? resolveSiteOriginFromRequest(request)
    : resolveSiteOrigin();
  return `${origin}/api/internal/campaign-process`;
}

function resolveDispatchAuthHeader(): string | undefined {
  const secret = resolveInternalJobSecret();
  return secret ? `Bearer ${secret}` : undefined;
}

function scheduleInlineFallback(input: CampaignBackgroundJobInput): void {
  if (process.env.NODE_ENV === "production") {
    after(() => {
      void processCampaignInBackground(input);
    });
    return;
  }

  void processCampaignInBackground(input);
}

function logDispatchAuthMode(): void {
  if (process.env.CRON_SECRET?.trim()) {
    return;
  }

  if (process.env.INTERNAL_JOB_SECRET?.trim()) {
    console.warn(
      "[CAMPAIGN_DISPATCH]: CRON_SECRET yok — INTERNAL_JOB_SECRET ile internal route kullanılıyor.",
    );
    return;
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    console.warn(
      "[CAMPAIGN_DISPATCH]: CRON_SECRET yok — SUPABASE_SERVICE_ROLE_KEY ile internal route kullanılıyor.",
    );
    return;
  }

  console.error(
    "[CAMPAIGN_DISPATCH]: Internal job secret yok — kısa süreli inline fallback kullanılıyor.",
  );
}

/** Arka plan kampanya motorunu uzun süreli internal route üzerinden tetikler. */
export function dispatchCampaignBackgroundJob(
  input: CampaignBackgroundJobInput,
  request?: Request,
): void {
  const authHeader = resolveDispatchAuthHeader();
  const processUrl = resolveInternalProcessUrl(request);

  if (!authHeader) {
    logDispatchAuthMode();
    scheduleInlineFallback(input);
    return;
  }

  if (!process.env.CRON_SECRET?.trim()) {
    logDispatchAuthMode();
  }

  void fetch(processUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(input),
  })
    .then(async (response) => {
      if (response.ok) {
        return;
      }

      const body = await response.text().catch(() => "");
      console.error(
        `[CAMPAIGN_DISPATCH]: Internal process HTTP ${response.status}${body ? ` — ${body.slice(0, 200)}` : ""}; inline fallback.`,
      );
      scheduleInlineFallback(input);
    })
    .catch((error) => {
      console.error(
        "[CAMPAIGN_DISPATCH]: Internal process tetiklenemedi, inline fallback:",
        error,
      );
      scheduleInlineFallback(input);
    });
}
