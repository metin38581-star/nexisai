import { NextResponse } from "next/server";

import { handleApiRouteError } from "@/lib/api-error";
import { getActiveUserId } from "@/lib/auth-session";
import {
  clampCampaignDailyBudget,
  clampCampaignDays,
  MIN_CAMPAIGN_DAILY_BUDGET,
  MIN_CAMPAIGN_DAYS,
} from "@/lib/campaign-form-utils";
import { isCoreQuestionSectorSupported } from "@/lib/core-questions";
import { buildLiveVisibilityForecast } from "@/services/live-visibility-forecast-service";
import type { BusinessSector, LiveVisibilityForecastRequest } from "@/types/campaign";

export async function POST(request: Request) {
  try {
    const activeUserId = await getActiveUserId(request);
    if (!activeUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Görünürlük tahmini için oturum açmanız gerekiyor.",
        },
        { status: 401 },
      );
    }

    const body = (await request.json()) as LiveVisibilityForecastRequest;
    const businessName = body.businessName?.trim() ?? "";
    const city = body.city?.trim() ?? "";
    const sectorSlug = (body.sector ?? body.sectorSlug ?? "") as BusinessSector | "";
    const dailyBudget = clampCampaignDailyBudget(
      Number(body.dailyBudget) || MIN_CAMPAIGN_DAILY_BUDGET,
    );
    const campaignDays = clampCampaignDays(
      Number(body.campaignDays ?? body.totalDays) || MIN_CAMPAIGN_DAYS,
    );

    if (!businessName || !city || !sectorSlug) {
      return NextResponse.json(
        {
          success: false,
          error: "İşletme adı, şehir ve sektör zorunludur.",
        },
        { status: 400 },
      );
    }

    if (!isCoreQuestionSectorSupported(sectorSlug)) {
      return NextResponse.json(
        {
          success: false,
          error: "Seçilen sektör için görünürlük tahmini henüz aktif değil.",
        },
        { status: 400 },
      );
    }

    const forecast = await buildLiveVisibilityForecast({
      businessName,
      city,
      sectorSlug,
      dailyBudget,
      campaignDays,
    });

    return NextResponse.json(forecast);
  } catch (error) {
    return handleApiRouteError(error, "Görünürlük tahmini oluşturulamadı.");
  }
}
