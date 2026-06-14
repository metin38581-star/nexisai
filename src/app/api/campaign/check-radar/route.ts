import { runBulkRadarScan } from "@/lib/radar-engine";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const report = await runBulkRadarScan();
    return NextResponse.json(report);
  } catch (error) {
    console.error("[RADAR_ERROR]:", error);
    return NextResponse.json(
      { error: "Toplu radar taraması başarısız oldu" },
      { status: 500 },
    );
  }
}

export async function POST() {
  return GET();
}
