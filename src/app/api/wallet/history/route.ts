import { NextResponse } from "next/server";

import { handleApiRouteError, assertDatabaseEnv } from "@/lib/api-error";
import { getActiveUserId } from "@/lib/auth-session";
import { listWalletCreditHistoryByUserId } from "@/lib/payment-store";

export async function GET(request: Request) {
  try {
    assertDatabaseEnv();

    const activeUserId = await getActiveUserId(request);
    if (!activeUserId) {
      return NextResponse.json(
        { success: false, error: "Bakiye geçmişi için oturum açmanız gerekiyor." },
        { status: 401 },
      );
    }

    const entries = await listWalletCreditHistoryByUserId(activeUserId);

    return NextResponse.json({
      success: true,
      entries,
    });
  } catch (error) {
    return handleApiRouteError(error, "Bakiye geçmişi alınamadı.");
  }
}
