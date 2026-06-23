import { NextResponse } from "next/server";

import { handleApiRouteError } from "@/lib/api-error";
import { processDueGrowthLoops } from "@/lib/growth-loop-store";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET?.trim();

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const processed = await processDueGrowthLoops();

    return NextResponse.json({
      success: true,
      processed,
    });
  } catch (error) {
    return handleApiRouteError(error, "Growth loop işlenemedi.");
  }
}

export async function POST(request: Request) {
  return GET(request);
}
