import { NextResponse } from "next/server";

import { handleApiRouteError } from "@/lib/api-error";
import { generateMicroIntents } from "@/lib/geo-engine";
import { getActiveUserId } from "@/lib/auth-session";
import { logServerEnvStatus } from "@/lib/server-env";
import type { GeoIntentsRequestBody } from "@/types/geo-intent";

export async function POST(request: Request) {
  try {
    logServerEnvStatus("campaign-intents");
    const activeUserId = await getActiveUserId(request);
    if (!activeUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Mikro niyet taraması için oturum açmanız gerekiyor.",
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

    const intents = await generateMicroIntents(sehir, sektor, markaAdi);

    return NextResponse.json({
      intents,
      sehir,
      sektor,
      markaAdi,
    });
  } catch (error) {
    return handleApiRouteError(error, "Mikro niyet motoru yanıt veremedi.");
  }
}
