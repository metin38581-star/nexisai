import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
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
