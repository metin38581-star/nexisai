import { NextResponse } from "next/server";

import { handleApiRouteError } from "@/lib/api-error";
import {
  fillQuestionTemplate,
  getCoreQuestionsForSector,
  resolveBusinessSectorFromCore,
  resolveCoreQuestionSectorFromLabel,
  resolveMaxSelection,
} from "@/lib/core-questions";
import { resolveMaxQuestionsFromDailyBudget } from "@/lib/intent-soft-cap";
import { getActiveUserId } from "@/lib/auth-session";
import { logServerEnvStatus } from "@/lib/server-env";
import { buildFallbackSimulatedAnswer } from "@/lib/selected-questions";
import type { GeoIntentsRequestBody } from "@/types/geo-intent";

export async function POST(request: Request) {
  try {
    logServerEnvStatus("campaign-intents");
    const activeUserId = await getActiveUserId(request);
    if (!activeUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Kemik soru havuzu için oturum açmanız gerekiyor.",
        },
        { status: 401 },
      );
    }

    const body = (await request.json()) as GeoIntentsRequestBody;
    const sehir = body.sehir?.trim();
    const sektor = body.sektor?.trim();
    const markaAdi = body.markaAdi?.trim();

    if (!sehir || !sektor || !markaAdi) {
      return NextResponse.json(
        { success: false, error: "sehir, sektor ve markaAdi zorunludur." },
        { status: 400 },
      );
    }

    const coreSector = resolveCoreQuestionSectorFromLabel(sektor);
    if (!coreSector) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bu sektör için kemik soru havuzu henüz tanımlı değil (Diş Kliniği, Otel, Restoran).",
        },
        { status: 400 },
      );
    }

    const gunlukButce = Number(body.gunlukButce ?? body.dailyBudget) || 100;
    const pool = getCoreQuestionsForSector(coreSector);
    const maxQuestions = resolveMaxQuestionsFromDailyBudget(
      gunlukButce,
      pool.length,
    );
    const maxSelection = resolveMaxSelection(
      gunlukButce,
      resolveBusinessSectorFromCore(coreSector),
    );

    const intents = pool.slice(0, maxSelection).map((question, index) => {
      const filledQuestion = fillQuestionTemplate(question.template, sehir);

      return {
        id: question.id,
        question: filledQuestion,
        simulatedAnswer: buildFallbackSimulatedAnswer(
          filledQuestion,
          markaAdi,
          sehir,
          sektor,
        ),
        sortOrder: index,
      };
    });

    return NextResponse.json({
      intents,
      maxQuestions,
      maxSelection,
      gunlukButce,
      sehir,
      sektor,
      markaAdi,
    });
  } catch (error) {
    return handleApiRouteError(error, "Kemik soru havuzu yanıt veremedi.");
  }
}
