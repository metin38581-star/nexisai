import "server-only";

import { after } from "next/server";

import type { CampaignBackgroundJobInput } from "@/lib/campaign-background-processor";
import { processCampaignInBackground } from "@/lib/campaign-background-processor";
import { resolveSiteOrigin } from "@/lib/site-origin";

function resolveInternalProcessUrl(): string {
  return `${resolveSiteOrigin()}/api/internal/campaign-process`;
}

function resolveDispatchAuthHeader(): string | undefined {
  const secret = process.env.CRON_SECRET?.trim();
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

/** Arka plan kampanya motorunu uzun süreli internal route üzerinden tetikler. */
export function dispatchCampaignBackgroundJob(
  input: CampaignBackgroundJobInput,
): void {
  const authHeader = resolveDispatchAuthHeader();

  if (!authHeader) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[CAMPAIGN_DISPATCH]: CRON_SECRET tanımlı değil — internal route devreye alınamıyor.",
      );
    }
    scheduleInlineFallback(input);
    return;
  }

  void fetch(resolveInternalProcessUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(input),
  }).catch((error) => {
    console.error(
      "[CAMPAIGN_DISPATCH]: Internal process tetiklenemedi, inline fallback:",
      error,
    );
    scheduleInlineFallback(input);
  });
}
