import { runBulkRadarScan } from "@/lib/radar-engine";
import { NextResponse } from "next/server";

import { handleApiRouteError, assertDataAccessEnv } from "@/lib/api-error";
import { logServerEnvStatus } from "@/lib/server-env";

export async function GET() {
  try {
    logServerEnvStatus("check-radar");
    assertDataAccessEnv();
    const report = await runBulkRadarScan();
    return NextResponse.json(report);
  } catch (error) {
    return handleApiRouteError(error, "Toplu radar taraması başarısız oldu.");
  }
}

export async function POST() {
  return GET();
}
