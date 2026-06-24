import { NextResponse } from "next/server";

import { handleApiRouteError, assertDataAccessEnv } from "@/lib/api-error";
import { runBulkRadarScan } from "@/lib/radar-engine";
import { getActiveUserId } from "@/lib/auth-session";
import { logServerEnvStatus } from "@/lib/server-env";

async function handleRadarScan(request: Request) {
  logServerEnvStatus("check-radar");
  assertDataAccessEnv();

  const activeUserId = await getActiveUserId(request);
  if (!activeUserId) {
    return NextResponse.json(
      { success: false, error: "Radar taraması için oturum açmanız gerekiyor." },
      { status: 401 },
    );
  }

  const report = await runBulkRadarScan();
  return NextResponse.json(report);
}

export async function GET(request: Request) {
  try {
    return await handleRadarScan(request);
  } catch (error) {
    return handleApiRouteError(error, "Toplu radar taraması başarısız oldu.");
  }
}

export async function POST(request: Request) {
  return GET(request);
}
