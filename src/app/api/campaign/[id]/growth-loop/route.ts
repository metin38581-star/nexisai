import { NextResponse } from "next/server";

import { handleApiRouteError } from "@/lib/api-error";
import { getCampaignGrowthLoop } from "@/lib/growth-loop-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const loop = await getCampaignGrowthLoop(id);

    if (!loop) {
      return NextResponse.json(
        { success: false, error: "Growth loop bulunamadı." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, ...loop });
  } catch (error) {
    return handleApiRouteError(error, "Growth loop alınamadı.");
  }
}
