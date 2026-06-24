import { NextResponse } from "next/server";

import { handleApiRouteError } from "@/lib/api-error";
import { processDueGrowthLoops } from "@/lib/growth-loop-store";
import { cronUnauthorizedResponse, isCronAuthorized } from "@/lib/cron-auth";

export async function GET(request: Request) {
  try {
    if (!isCronAuthorized(request)) {
      return cronUnauthorizedResponse();
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
