import { NextResponse } from "next/server";

import { handleApiRouteError } from "@/lib/api-error";
import { getActiveUserId } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { getCampaignGrowthLoop } from "@/lib/growth-loop-store";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const activeUserId = await getActiveUserId(request);
    if (!activeUserId) {
      return NextResponse.json(
        { success: false, error: "Growth loop için oturum açmanız gerekiyor." },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!campaign || campaign.userId !== activeUserId) {
      return NextResponse.json(
        { success: false, error: "Bu kampanyaya erişim yetkiniz yok." },
        { status: 403 },
      );
    }

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
