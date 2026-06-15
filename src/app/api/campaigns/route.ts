import { NextResponse } from "next/server";

import { assertDataAccessEnv, handleApiRouteError } from "@/lib/api-error";
import { listCampaignsByUserId } from "@/lib/campaign-store";
import { getActiveUserId } from "@/lib/auth-session";
import { logServerEnvStatus } from "@/lib/server-env";

export async function GET(request: Request) {
  try {
    logServerEnvStatus("campaigns-get");
    assertDataAccessEnv();

    const activeUserId = await getActiveUserId(request);
    if (!activeUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Kampanyaları görüntülemek için oturum açmanız gerekiyor.",
        },
        { status: 401 },
      );
    }

    const campaigns = await listCampaignsByUserId(activeUserId);

    return NextResponse.json(campaigns);
  } catch (error) {
    return handleApiRouteError(error, "Kampanyalar yüklenirken bir hata oluştu.");
  }
}
