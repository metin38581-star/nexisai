import { NextResponse } from "next/server";

import { handleApiRouteError } from "@/lib/api-error";
import { hasCorporateBrandTitleInBusinessName } from "@/lib/business-name-match";
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

export const maxDuration = 60;

export async function POST(request: Request) {
  const startedAt = Date.now();

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

    console.log("[VISIBILITY_FORECAST]: istek alındı", {
      businessName,
      city,
      sectorSlug,
      dailyBudget,
      campaignDays,
      userId: activeUserId,
    });

    const { view, trace } = await buildLiveVisibilityForecast({
      businessName,
      city,
      sectorSlug,
      dailyBudget,
      campaignDays,
      skipCache: body.skipCache === true,
    });

    console.log("LLM Sorgusu Ateşleniyor:", trace.cityLabel, trace.categoryLabel);
    console.log("LLM Prompt:", trace.prompt);

    if (trace.responseText) {
      console.log("LLM'den Gelen Ham Metin:", trace.responseText);
    } else if (!trace.cacheHit) {
      console.log("LLM'den Gelen Ham Metin: (boş veya hata fallback)");
    }

    console.log("[VISIBILITY_FORECAST]: sonuç", {
      cacheHit: trace.cacheHit,
      isLiveData: trace.isLiveData,
      mentioned: trace.mentioned,
      startRate: trace.startRate,
      fallbackTier: trace.fallbackTier,
      brandHasCorporateTitle: hasCorporateBrandTitleInBusinessName(businessName),
      targetRate: view.metrics.targetRecommendationRate,
      elapsedMs: Date.now() - startedAt,
    });

    return NextResponse.json(view);
  } catch (error) {
    console.error("LLM Çağrısı Sırasında Patlayan Hata:", error);
    return handleApiRouteError(error, "Görünürlük tahmini oluşturulamadı.");
  }
}
