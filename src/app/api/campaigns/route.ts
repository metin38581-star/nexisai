import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

import { getActiveUserId } from "@/lib/auth-session";

export async function GET(request: Request) {
  try {
    const activeUserId = await getActiveUserId(request);
    if (!activeUserId) {
      return NextResponse.json(
        { error: "Kampanyaları görüntülemek için oturum açmanız gerekiyor." },
        { status: 401 },
      );
    }

    const campaigns = await prisma.campaign.findMany({
      where: {
        userId: activeUserId,
      },
      include: {
        baits: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("[API_CAMPAIGNS_GET_ERROR]:", error);
    return NextResponse.json(
      { error: "Kampanyalar yüklenirken bir hata oluştu" },
      { status: 500 },
    );
  }
}
