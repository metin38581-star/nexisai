import { NextResponse } from "next/server";

import { assertDataAccessEnv, handleApiRouteError } from "@/lib/api-error";
import { logServerEnvStatus } from "@/lib/server-env";
import {
  generateSectorAnchorQuestions,
} from "@/lib/sector-questions-generator";
import { buildCustomAnchorQuestionId } from "@/lib/sector-utils";

export async function POST(request: Request) {
  try {
    logServerEnvStatus("campaign-sector-questions");
    assertDataAccessEnv();

    const body = (await request.json()) as { customSector?: string };
    const customSector = body.customSector?.trim();

    if (!customSector || customSector.length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: "Özel sektör adı en az 3 karakter olmalıdır.",
        },
        { status: 400 },
      );
    }

    const templates = await generateSectorAnchorQuestions(customSector);
    const questions = templates.map((template, index) => ({
      id: buildCustomAnchorQuestionId(index),
      template,
    }));

    return NextResponse.json({
      success: true,
      customSector,
      questions,
      count: questions.length,
    });
  } catch (error) {
    return handleApiRouteError(error, "Niş sektör kemik soruları üretilemedi.");
  }
}
