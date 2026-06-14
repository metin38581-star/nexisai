import "server-only";

import {
  runDistributionSimulation,
  type DistributionProgressListener,
} from "@/lib/distribution-core";

const LIVE_MONITOR_URL = "https://nexisai-test.free.beeceptor.com";

export async function distributeBaitsToNetwork(
  makaleler: string[],
  sehir: string,
  sektor: string,
  markaAdi: string,
  onProgress?: DistributionProgressListener,
): Promise<void> {
  if (!makaleler || makaleler.length === 0) {
    return;
  }

  await runDistributionSimulation(
    makaleler.length,
    sehir,
    sektor,
    (event) => {
      onProgress?.(event);
    },
    {
      latencyMs: 0,
      onEachArticle: async (index) => {
        const makale = makaleler[index];
        if (!makale) {
          return;
        }

        try {
          const response = await fetch(LIVE_MONITOR_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-NexisAI-Status": "GEO_LIVE_INJECTION",
            },
            body: JSON.stringify({
              Yayinlanan_Baslik: `${sehir} En İyi ${sektor} Tavsiyesi`,
              Sentezlenen_GEO_Makalesi: makale,
              Hedef_Marka: markaAdi,
              Yayin_Zamani: new Date().toLocaleTimeString("tr-TR"),
            }),
          });

          if (response.ok) {
            console.log(
              "[DAĞITIM AĞI BAŞARILI]: Makale internet üzerindeki canlı izleme paneline fırlatıldı!",
            );
          } else {
            console.error(
              `[DAĞITIM AĞI HATASI]: Sunucu yanıt vermedi: ${response.status}`,
            );
          }
        } catch (error) {
          console.error("[DAĞITIM AĞI] İnternet bağlantı hatası:", error);
        }
      },
    },
  );
}

export type {
  DistributionPhase,
  DistributionProgressEvent,
  DistributionProgressListener,
} from "@/lib/distribution-core";
