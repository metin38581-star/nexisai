import { NextResponse } from "next/server";

import type { CampaignApiRequest, CampaignResponse } from "@/types/campaign";
import { formatRadarSikligi } from "@/lib/campaign-budget";
import {
  buildIntentArticleHtml,
  buildIntentPostTitle,
  buildSemanticAnchorSlug,
} from "@/lib/geo-prompt";
import { generateAiBaits, deployBaitsToNetwork } from "@/lib/bait-engine";
import { buildHubArticlePath, buildHubArticleUrl } from "@/lib/hub-url";
import { prisma } from "@/lib/db";
import { distributeBaitsToNetwork } from "@/lib/distribution-engine";
import { generateInvisibleBaits } from "@/lib/geo-engine";
import { buildUniqueArticleSlug } from "@/lib/slugify";
import { queryLlmInquiry } from "@/lib/llm-simulator";
import { buildDynamicTerminalLogs } from "@/lib/terminal-logs";
import { calculateDynamicMetrics } from "@/lib/mock-metrics";
import { getActiveUserId } from "@/lib/auth-session";

function buildFallbackMakaleler(count: number): string[] {
  return Array.from(
    { length: count },
    (_, index) => `Alternatif GEO yemleme içeriği ${index + 1}`,
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CampaignApiRequest;

    const gunlukButce = Number(body.gunlukButce) || 10;
    const gunSayisi = Number(body.gunSayisi) || 7;
    const toplamMaliyet = gunlukButce * gunSayisi;

    let makaleSayisi = 2;
    let agresiflikSeviyesi = "Düşük";
    let radarSikligiDakika = 1440;

    if (gunlukButce > 100) {
      makaleSayisi = 15;
      agresiflikSeviyesi = "Kritik Domination";
      radarSikligiDakika = 15;
    } else if (gunlukButce > 50) {
      makaleSayisi = 8;
      agresiflikSeviyesi = "Yüksek";
      radarSikligiDakika = 60;
    } else if (gunlukButce > 15) {
      makaleSayisi = 4;
      agresiflikSeviyesi = "Orta";
      radarSikligiDakika = 360;
    }

    const radarSikligi = formatRadarSikligi(radarSikligiDakika);

    const { markaAdi, sektor, sehir } = body;

    if (!markaAdi?.trim() || !sehir?.trim()) {
      return NextResponse.json(
        { success: false, error: "İşletme adı ve şehir zorunludur." },
        { status: 400 },
      );
    }

    if (!sektor?.trim()) {
      return NextResponse.json(
        { success: false, error: "Sektör bilgisi zorunludur." },
        { status: 400 },
      );
    }

    if (gunlukButce < 10) {
      return NextResponse.json(
        { success: false, error: "Günlük bütçe en az 10 TL olmalıdır." },
        { status: 400 },
      );
    }

    if (gunSayisi < 1) {
      return NextResponse.json(
        { success: false, error: "Kampanya süresi geçerli olmalıdır." },
        { status: 400 },
      );
    }

    const activeUserId = await getActiveUserId(request);
    if (!activeUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Kampanya oluşturmak için oturum açmanız gerekiyor.",
        },
        { status: 401 },
      );
    }

    const trimmedMarka = markaAdi.trim();
    const trimmedSektor = sektor.trim();
    const trimmedSehir = sehir.trim();

    const selectedIntents =
      body.selectedIntents?.filter(
        (intent) => intent.question?.trim() && intent.simulatedAnswer?.trim(),
      ) ?? [];

    if (selectedIntents.length > 0) {
      makaleSayisi = selectedIntents.length;
    }

    let wallet = await prisma.wallet.findFirst();

    if (!wallet) {
      wallet = await prisma.wallet.create({ data: { balance: 500.0 } });
    }

    if (wallet.balance < toplamMaliyet) {
      return NextResponse.json(
        {
          error: `SİBER BAKİYE HATASI: Bu operasyonun toplam maliyeti $${toplamMaliyet}. Mevcut bakiyeniz ($${wallet.balance}) yetersizdir!`,
        },
        { status: 400 },
      );
    }

    const aiBaits = generateAiBaits(trimmedMarka, trimmedSektor, trimmedSehir);

    const [llmResult, baitDeployment, gizliMakaleler] = await Promise.all([
      queryLlmInquiry(
        trimmedSehir,
        trimmedSektor,
        trimmedMarka,
        gunlukButce,
        gunSayisi,
      ),
      deployBaitsToNetwork(aiBaits, gunlukButce),
      selectedIntents.length > 0
        ? Promise.resolve([] as string[])
        : generateInvisibleBaits(
            trimmedSehir,
            trimmedSektor,
            trimmedMarka,
            makaleSayisi,
          ),
    ]);

    console.log(
      "[GİZLİ GEO MOTORU]: Üretilen Makaleler ->",
      gizliMakaleler.length,
      "/ hedef",
      makaleSayisi,
    );
    console.log("[GEO MOD]:", {
      gunlukButce,
      gunSayisi,
      makaleSayisi,
      agresiflikSeviyesi,
      radarSikligi,
      radarSikligiDakika,
    });

    const pazarAnalizSkoru = llmResult.yapayZekaGorunurlukOrani;
    const kaydedilecekMakaleler =
      gizliMakaleler.length > 0
        ? gizliMakaleler.slice(0, makaleSayisi)
        : buildFallbackMakaleler(makaleSayisi);

    let persistedBaits: Array<{
      id: string;
      baslik: string;
      icerik: string;
      slug: string;
    }> = [];

    let persistedCampaignId: string | null = null;

    let distributionResults: Array<{
      baitId: string;
      slug: string;
      ok: boolean;
      externalLiveUrl?: string;
    }> = [];

    try {
      const targetCity = body?.sehir || "Kayseri";
      const targetNiche = body?.sektor || "Diş Kliniği & Sağlık";
      const targetBrand = body?.markaAdi || "Bilinmeyen Marka";
      const currentScore =
        typeof pazarAnalizSkoru === "number" ? pazarAnalizSkoru : 38;

      console.log("[VERİTABANI ÖNCESİ]: Kaydedilecek veriler hazırlanıyor...", {
        targetCity,
        targetNiche,
        targetBrand,
        gunlukButce,
        gunSayisi,
        makaleSayisi,
        agresiflikSeviyesi,
        radarSikligi,
        radarSikligiDakika,
      });

      const usedSlugs = new Set<string>();

      const baitRecords =
        selectedIntents.length > 0
          ? selectedIntents.map((intent, index) => {
              const baslik = buildIntentPostTitle(
                targetCity,
                targetNiche,
                index,
                intent.question,
              );
              let slug = buildSemanticAnchorSlug(
                targetCity,
                targetNiche,
                intent.question,
                targetBrand,
                index,
              );
              while (usedSlugs.has(slug)) {
                slug = `${slug}-${usedSlugs.size + 1}`;
              }
              usedSlugs.add(slug);

              return {
                baslik,
                icerik: buildIntentArticleHtml(
                  intent.question,
                  intent.simulatedAnswer,
                  targetBrand,
                  targetCity,
                  targetNiche,
                ),
                slug,
                platform: "NexisAI Hub",
              };
            })
          : kaydedilecekMakaleler.map((makale, index) => {
              const baslik = buildIntentPostTitle(
                targetCity,
                targetNiche,
                index,
              );
              const slug = buildUniqueArticleSlug(baslik, index, usedSlugs);

              return {
                baslik,
                icerik: makale,
                slug,
                platform: "NexisAI Hub",
              };
            });

      const yeniKampanya = await prisma.campaign.create({
        data: {
          userId: activeUserId,
          sehir: targetCity,
          sektor: targetNiche,
          markaAdi: targetBrand,
          skor: currentScore,
          gunlukButce,
          gunSayisi,
          agresiflik: agresiflikSeviyesi,
          makaleSayisi,
          radarSikligi,
          radarSikligiDakika,
          baits: {
            create: baitRecords,
          },
        },
        include: { baits: true },
      });

      persistedBaits = yeniKampanya.baits.map((bait) => ({
        id: bait.id,
        baslik: bait.baslik,
        icerik: bait.icerik,
        slug: bait.slug,
      }));
      persistedCampaignId = yeniKampanya.id;

      console.log(
        `[VERİTABANI BAŞARILI]: Kampanya ID ${yeniKampanya.id} — agresiflik=${agresiflikSeviyesi}, makale=${makaleSayisi}, radar=${radarSikligiDakika}dk`,
      );

      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: toplamMaliyet } },
      });

      console.log(
        `[CÜZDAN TASARRUFU]: $${toplamMaliyet} bakiyeden düşüldü. Yeni bakiye: $${wallet.balance - toplamMaliyet}`,
      );
    } catch (dbError) {
      console.error(
        "[KRİTİK VERİTABANI HATASI]: Veri tabanına yazılırken bir hata oluştu:",
        dbError,
      );
    }

    if (persistedBaits.length > 0 && persistedCampaignId) {
      distributionResults = await distributeBaitsToNetwork(persistedBaits, {
        campaignId: persistedCampaignId,
        markaAdi: trimmedMarka,
        sehir: trimmedSehir,
        sektor: trimmedSektor,
        agresiflik: agresiflikSeviyesi,
      });
    }

    const campaignExternalUrl = distributionResults.find(
      (result) => result.ok && result.externalLiveUrl,
    )?.externalLiveUrl;

    const primarySlug = persistedBaits[0]?.slug;
    const hubArticles = persistedBaits.map((bait) => ({
      slug: bait.slug,
      hubPath: buildHubArticlePath(bait.slug),
    }));

    const terminalLogs = buildDynamicTerminalLogs(
      { ...body, gunlukButce, gunSayisi },
      llmResult,
      baitDeployment,
    );
    const metrics = calculateDynamicMetrics(
      { ...body, gunlukButce, gunSayisi },
      llmResult,
    );

    const response: CampaignResponse = {
      success: true,
      metrics,
      terminalLogs,
      llmResult,
      baitsGenerated: kaydedilecekMakaleler.length,
      message: "İçerikler başarıyla yayınlandı!",
      liveUrl: campaignExternalUrl,
      externalUrl: campaignExternalUrl ?? null,
      nexisUrl: primarySlug ? buildHubArticleUrl(primarySlug) : undefined,
      hubArticles,
      distributionResults,
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { success: false, error: "İşlem sırasında bir hata oluştu." },
      { status: 500 },
    );
  }
}
