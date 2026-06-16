import { NextResponse } from "next/server";

import { assertDataAccessEnv, handleApiRouteError } from "@/lib/api-error";
import { getActiveUserId } from "@/lib/auth-session";
import { generateMarketIntelligence } from "@/lib/market-intelligence-engine";
import {
  getFreshMarketIntelligence,
  toGeoMicroIntents,
} from "@/lib/market-intelligence-store";
import { resolveMaxQuestionsFromDailyBudget } from "@/lib/intent-soft-cap";
import { logServerEnvStatus } from "@/lib/server-env";
import type { MarketAnalyzeRequest } from "@/types/market-intelligence";

export async function POST(request: Request) {
  try {
    logServerEnvStatus("campaign-analyze");
    assertDataAccessEnv();

    const activeUserId = await getActiveUserId(request);
    if (!activeUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Pazar analizi için oturum açmanız gerekiyor.",
        },
        { status: 401 },
      );
    }

    const body = (await request.json()) as MarketAnalyzeRequest;
    const sehir = body.sehir?.trim();
    const sektor = body.sektor?.trim();
    const markaAdi = body.markaAdi?.trim();
    const gunlukButce = Number(body.gunlukButce ?? body.dailyBudget) || 50;
    const maxQuestions = resolveMaxQuestionsFromDailyBudget(gunlukButce);

    if (!sehir || !sektor || !markaAdi) {
      return NextResponse.json(
        { success: false, error: "sehir, sektor ve markaAdi zorunludur." },
        { status: 400 },
      );
    }

    const cached = await getFreshMarketIntelligence(sektor, sehir);

    if (cached && cached.length >= maxQuestions) {
      console.log(
        "[PAZAR_ISTİHBARAT]: Önbellekten döndü —",
        sektor,
        sehir,
        `(${maxQuestions}/${cached.length})`,
      );
      return NextResponse.json({
        success: true,
        intents: toGeoMicroIntents(cached, markaAdi).slice(0, maxQuestions),
        cached: true,
        source: "cache",
        maxQuestions,
        gunlukButce,
        sehir,
        sektor,
        markaAdi,
      });
    }

    console.log(
      "[PAZAR_ISTİHBARAT]: Gemini ile yeni analiz —",
      sektor,
      sehir,
      markaAdi,
      `maxQuestions=${maxQuestions}`,
    );

    const freshEntries = await generateMarketIntelligence(
      sehir,
      sektor,
      markaAdi,
      maxQuestions,
    );

    return NextResponse.json({
      success: true,
      intents: toGeoMicroIntents(
        freshEntries.map((entry) => ({
          question: entry.question,
          simulatedAnswer: entry.simulatedAnswer,
        })),
        markaAdi,
      ),
      cached: false,
      source: "gemini",
      maxQuestions,
      gunlukButce,
      sehir,
      sektor,
      markaAdi,
    });
  } catch (error) {
    return handleApiRouteError(error, "Pazar istihbarat analizi başarısız.");
  }
}
