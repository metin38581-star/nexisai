import { NextResponse } from "next/server";

import { assertDataAccessEnv, handleApiRouteError } from "@/lib/api-error";
import { getActiveUserId } from "@/lib/auth-session";
import { generateMarketIntelligence } from "@/lib/market-intelligence-engine";
import {
  getFreshMarketIntelligence,
  toGeoMicroIntents,
} from "@/lib/market-intelligence-store";
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

    if (!sehir || !sektor || !markaAdi) {
      return NextResponse.json(
        { success: false, error: "sehir, sektor ve markaAdi zorunludur." },
        { status: 400 },
      );
    }

    const cached = await getFreshMarketIntelligence(sektor, sehir);

    if (cached && cached.length > 0) {
      console.log(
        "[PAZAR_ISTİHBARAT]: Önbellekten döndü —",
        sektor,
        sehir,
      );
      return NextResponse.json({
        success: true,
        intents: toGeoMicroIntents(cached, markaAdi),
        cached: true,
        source: "cache",
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
    );

    const freshEntries = await generateMarketIntelligence(
      sehir,
      sektor,
      markaAdi,
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
      sehir,
      sektor,
      markaAdi,
    });
  } catch (error) {
    return handleApiRouteError(error, "Pazar istihbarat analizi başarısız.");
  }
}
