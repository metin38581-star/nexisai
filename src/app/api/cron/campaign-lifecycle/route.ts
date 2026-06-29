import { NextResponse } from "next/server";

import { handleApiRouteError } from "@/lib/api-error";
import { expireCompletedCampaigns } from "@/lib/campaign-payment-service";
import { cronUnauthorizedResponse, isCronAuthorized } from "@/lib/cron-auth";

export const maxDuration = 60;

export async function GET(request: Request) {
  return runCampaignLifecycle(request);
}

export async function POST(request: Request) {
  return runCampaignLifecycle(request);
}

async function runCampaignLifecycle(request: Request) {
  try {
    if (!isCronAuthorized(request)) {
      return cronUnauthorizedResponse();
    }

    const expiredCount = await expireCompletedCampaigns();

    return NextResponse.json({
      success: true,
      expiredCount,
      message:
        expiredCount > 0
          ? `${expiredCount} kampanya süresi doldu — completed olarak işaretlendi.`
          : "Süresi dolmuş aktif kampanya yok.",
    });
  } catch (error) {
    return handleApiRouteError(error, "Kampanya yaşam döngüsü cron hatası.");
  }
}
