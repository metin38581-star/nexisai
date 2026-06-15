import { NextResponse } from "next/server";

import { generateMicroIntents } from "@/lib/geo-engine";
import { getActiveUserId } from "@/lib/auth-session";
import type { GeoIntentsRequestBody } from "@/types/geo-intent";

export async function POST(request: Request) {
  try {
    const activeUserId = await getActiveUserId(request);
    if (!activeUserId) {
      return NextResponse.json(
        { error: "Mikro niyet taraması için oturum açmanız gerekiyor." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as GeoIntentsRequestBody;
    const sehir = body.sehir?.trim();
    const sektor = body.sektor?.trim();
    const markaAdi = body.markaAdi?.trim();

    if (!sehir || !sektor || !markaAdi) {
      return NextResponse.json(
        { error: "sehir, sektor ve markaAdi zorunludur." },
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
    console.error("[API_CAMPAIGN_INTENTS_ERROR]:", error);
    return NextResponse.json(
      { error: "Mikro niyet motoru yanıt veremedi." },
      { status: 500 },
    );
  }
}
