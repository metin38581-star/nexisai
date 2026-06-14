import "server-only";

import { NextResponse } from "next/server";

import { publishToHubAndMake } from "@/lib/hybrid-publish";
import { buildPublishSlug } from "@/lib/slugify";
import { buildHubArticlePath } from "@/lib/hub-url";
import { prisma } from "@/lib/db";

/**
 * App Router karşılığı — eski Pages API handler akışı:
 * POST { title, content, userId?, sehir?, sektor?, markaAdi? }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title?: string;
      content?: string;
      userId?: string;
      sehir?: string;
      sektor?: string;
      markaAdi?: string;
      agresiflik?: string;
    };

    const title = body.title?.trim();
    const content = body.content?.trim();

    if (!title || !content) {
      return NextResponse.json(
        { error: "title ve content zorunludur." },
        { status: 400 },
      );
    }

    const slug = buildPublishSlug(title);
    const sehir = body.sehir?.trim() || "Kayseri";
    const sektor = body.sektor?.trim() || "Genel";
    const markaAdi = body.markaAdi?.trim() || "NexisAI Marka";
    const agresiflik = body.agresiflik?.trim() || "Orta";

    const campaign = await prisma.campaign.create({
      data: {
        sehir,
        sektor,
        markaAdi,
        skor: 50,
        gunlukButce: 10,
        gunSayisi: 7,
        agresiflik,
        makaleSayisi: 1,
        radarSikligi: "24 Saat",
        radarSikligiDakika: 1440,
        baits: {
          create: {
            baslik: title,
            icerik: content,
            slug,
            platform: "NexisAI Hub",
            status: "published",
            yayinlandi: true,
          },
        },
      },
      include: { baits: true },
    });

    const bait = campaign.baits[0];
    if (!bait) {
      return NextResponse.json(
        { error: "Makale kaydı oluşturulamadı." },
        { status: 500 },
      );
    }

    const publishResult = await publishToHubAndMake({
      campaignId: campaign.id,
      baitId: bait.id,
      baslik: title,
      icerik: content,
      slug,
      markaAdi,
      sehir,
      sektor,
      agresiflik,
    });

    return NextResponse.json({
      message: publishResult.message,
      nexisUrl: publishResult.nexisUrl,
      hubPath: buildHubArticlePath(slug),
      externalUrl: publishResult.externalUrl,
      campaignId: campaign.id,
      baitId: bait.id,
      slug,
      userId: body.userId ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Yayın sırasında hata oluştu.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
