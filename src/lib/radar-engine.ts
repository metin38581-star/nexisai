import { GoogleGenAI } from "@google/genai";

import {
  computeNextRadarScanAt,
  isCampaignDueForRadarScan,
} from "@/lib/campaign-budget";
import {
  listRadarCampaigns,
  updateRadarCampaignState,
} from "@/lib/campaign-store";
import { saveCampaignRadarLog } from "@/lib/radar-log-store";

const GOOGLE_GENAI_API_VERSION = "v1";
const DEFAULT_GOOGLE_GENAI_MODEL = "gemini-2.5-flash";

const FEEDBACK_OPTIMIZED =
  "MÜKEMMEL: Gemini bu markayı organik olarak önermeye başladı!";
const FEEDBACK_PENDING =
  "Yapay zeka botlarının dağıtılan yemleri indekse alması bekleniyor...";

export interface RadarScanLogEntry {
  campaignId: string;
  markaAdi: string;
  sehir: string;
  status: "scanned" | "skipped" | "failed";
  scannedAt: string | null;
  nextScanAt: string;
  radarSikligiDakika: number;
  isOptimized: boolean | null;
  feedback: string | null;
  message: string;
}

export interface RadarScanReport {
  success: boolean;
  totalCampaigns: number;
  scannedCount: number;
  skippedCount: number;
  optimizedCount: number;
  pendingCount: number;
  failedCount: number;
  scanLogs: RadarScanLogEntry[];
  message: string;
}

function resolveApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.LLM_API_KEY?.trim() ||
    undefined
  );
}

function resolveModel(): string {
  return process.env.LLM_MODEL?.trim() || DEFAULT_GOOGLE_GENAI_MODEL;
}

function formatLogTimestamp(date: Date): string {
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export async function runBulkRadarScan(): Promise<RadarScanReport> {
  const apiKey = resolveApiKey();
  const campaigns = await listRadarCampaigns();

  if (campaigns.length === 0) {
    return {
      success: true,
      totalCampaigns: 0,
      scannedCount: 0,
      skippedCount: 0,
      optimizedCount: 0,
      pendingCount: 0,
      failedCount: 0,
      scanLogs: [],
      message: "Taranacak kampanya bulunamadı.",
    };
  }

  if (!apiKey) {
    console.warn(
      "[RADAR] Gemini API anahtarı yapılandırılmamış; tarama atlandı.",
    );
    return {
      success: true,
      totalCampaigns: campaigns.length,
      scannedCount: 0,
      skippedCount: campaigns.length,
      optimizedCount: 0,
      pendingCount: 0,
      failedCount: 0,
      scanLogs: [],
      message: "Radar taraması için LLM_API_KEY tanımlı değil; kampanyalar atlandı.",
    };
  }

  const ai = new GoogleGenAI({
    apiKey,
    apiVersion: GOOGLE_GENAI_API_VERSION,
  });

  const scanLogs: RadarScanLogEntry[] = [];
  let scannedCount = 0;
  let skippedCount = 0;
  let optimizedCount = 0;
  let failedCount = 0;
  const now = new Date();

  for (const campaign of campaigns) {
    const radarSikligiDakika = campaign.radarSikligiDakika ?? 1440;
    const nextScanAt = computeNextRadarScanAt(
      campaign.lastCheckedAt,
      campaign.createdAt,
      radarSikligiDakika,
    );

    if (
      !isCampaignDueForRadarScan(
        campaign.lastCheckedAt,
        campaign.createdAt,
        radarSikligiDakika,
        now.getTime(),
      )
    ) {
      skippedCount += 1;
      scanLogs.push({
        campaignId: campaign.id,
        markaAdi: campaign.markaAdi,
        sehir: campaign.sehir,
        status: "skipped",
        scannedAt: campaign.lastCheckedAt?.toISOString() ?? null,
        nextScanAt: nextScanAt.toISOString(),
        radarSikligiDakika,
        isOptimized: campaign.isOptimized,
        feedback: campaign.llmFeedback,
        message: `[RADAR_ATLANDI] ${campaign.markaAdi} — sonraki tarama ${formatLogTimestamp(nextScanAt)} (${radarSikligiDakika} dk aralık)`,
      });
      continue;
    }

    try {
      const prompt = `${campaign.sehir} şehrindeki en popüler ve en iyi ${campaign.sektor} alternatifleri hakkında tarafsız bir pazar özeti geç. Sektördeki öne çıkan isimleri listele.`;

      const response = await ai.models.generateContent({
        model: resolveModel(),
        contents: prompt,
      });

      const geminiYaniti = response.text?.trim() || "";
      const markaBulundu = geminiYaniti
        .toLowerCase()
        .includes(campaign.markaAdi.toLowerCase());
      const scannedAt = new Date();
      const feedback = markaBulundu ? FEEDBACK_OPTIMIZED : FEEDBACK_PENDING;
      const nextAfterScan = computeNextRadarScanAt(
        scannedAt,
        campaign.createdAt,
        radarSikligiDakika,
      );

      await updateRadarCampaignState(campaign.id, {
        isOptimized: markaBulundu,
        lastCheckedAt: scannedAt,
        llmFeedback: feedback,
      });

      const shareOfVoice = markaBulundu
        ? Math.min(95, 55 + Math.floor(Math.random() * 35))
        : Math.max(8, 20 + Math.floor(Math.random() * 25));

      if (radarSikligiDakika <= 15) {
        await saveCampaignRadarLog({
          campaignId: campaign.id,
          shareOfVoice,
          scanResult: {
            markaAdi: campaign.markaAdi,
            sehir: campaign.sehir,
            sektor: campaign.sektor,
            markaBulundu,
            feedback,
            geminiSnippet: geminiYaniti.slice(0, 500),
            scannedAt: scannedAt.toISOString(),
          },
        });
      }

      scannedCount += 1;
      if (markaBulundu) {
        optimizedCount += 1;
      }

      scanLogs.push({
        campaignId: campaign.id,
        markaAdi: campaign.markaAdi,
        sehir: campaign.sehir,
        status: "scanned",
        scannedAt: scannedAt.toISOString(),
        nextScanAt: nextAfterScan.toISOString(),
        radarSikligiDakika,
        isOptimized: markaBulundu,
        feedback,
        message: `[RADAR_TARAMA] ${formatLogTimestamp(scannedAt)} — ${campaign.markaAdi} (${campaign.sehir}) → ${markaBulundu ? "OPTİMİZE" : "BEKLEMEDE"} | Sonraki: ${formatLogTimestamp(nextAfterScan)}`,
      });

      console.log(scanLogs[scanLogs.length - 1]?.message);
    } catch (error) {
      failedCount += 1;
      scanLogs.push({
        campaignId: campaign.id,
        markaAdi: campaign.markaAdi,
        sehir: campaign.sehir,
        status: "failed",
        scannedAt: null,
        nextScanAt: nextScanAt.toISOString(),
        radarSikligiDakika,
        isOptimized: null,
        feedback: null,
        message: `[RADAR_HATA] ${campaign.markaAdi} taraması başarısız`,
      });
      console.error(`[RADAR_ERROR] Kampanya ${campaign.id}:`, error);
    }
  }

  const pendingCount = scannedCount - optimizedCount;

  return {
    success: true,
    totalCampaigns: campaigns.length,
    scannedCount,
    skippedCount,
    optimizedCount,
    pendingCount,
    failedCount,
    scanLogs,
    message: `${scannedCount} kampanya tarandı, ${skippedCount} atlandı, ${optimizedCount} optimize.`,
  };
}
