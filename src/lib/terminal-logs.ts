import type {
  LlmInquiryResult,
  TerminalLogEntry,
} from "@/types/campaign";
import type { NormalizedCampaignApiRequest } from "@/lib/campaign-api-normalize";
import type { BaitDeploymentResult, NetworkDeployment } from "@/lib/bait-engine";
import { getDeploymentLogMessage } from "@/lib/bait-engine";
import { normalizeTerminalMessage } from "@/lib/terminal-message";
import { LOCAL_DATA_FALLBACK_NETWORK_LOG } from "@/lib/llm-simulator";

function formatTimestamp(offsetMs: number): string {
  const now = new Date(Date.now() + offsetMs);
  return now.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getSegmentCount(
  deployments: NetworkDeployment[],
  networkId: string,
): number {
  return (
    deployments.find((segment) => segment.networkId === networkId)
      ?.deployedCount ?? 0
  );
}

export function buildDynamicTerminalLogs(
  params: NormalizedCampaignApiRequest,
  llmResult: LlmInquiryResult,
  baitDeployment: BaitDeploymentResult,
): TerminalLogEntry[] {
  const { markaAdi, sektor, sehir, gunlukButce, gunSayisi } = params;
  const formattedBudget = gunlukButce.toLocaleString("tr-TR");
  const scanLabel = llmResult.isLiveData ? "Canlı LLM" : "NexisAI";

  const redditCount = getSegmentCount(baitDeployment.deployments, "reddit");
  const blogCount = getSegmentCount(baitDeployment.deployments, "blog");
  const forumCount = getSegmentCount(baitDeployment.deployments, "forum");
  const mediumCount = getSegmentCount(baitDeployment.deployments, "medium");

  const yapayZekaKarari = normalizeTerminalMessage(llmResult.analysisSummary);
  const tespitOzetMessage = llmResult.usedLocalDataFallback
    ? `Güvenli Yerel Veri Katmanı taraması tamamlandı. Görünürlük skoru: %${llmResult.yapayZekaGorunurlukOrani}.`
    : llmResult.isLiveData
      ? `Canlı LLM taraması tamamlandı. Görünürlük skoru: %${llmResult.yapayZekaGorunurlukOrani}.`
      : `Yapay zeka sistemlerinde '${markaAdi}' için görünürlük taraması tamamlandı. Görünürlük skoru: %${llmResult.yapayZekaGorunurlukOrani}.`;

  const aramaMessage = llmResult.isLiveData
    ? `Canlı yapay zeka motorlarına '${markaAdi}' markası için dijital görünürlük sorgusu gönderildi...`
    : `Yapay zeka indeksleri taranıyor... '${markaAdi}' markası için görünürlük analizi başlatıldı.`;

  const analizMessage = llmResult.usedLocalDataFallback
    ? `Güvenli Yerel Veri Katmanı aktif. '${markaAdi}' markasının dijital ayak izi analiz edildi.`
    : llmResult.isLiveData
      ? `Semantik indeksler işlendi... ${scanLabel} '${markaAdi}' marka görünürlük raporunu üretti.`
      : `Semantik ağlar taranıyor... '${markaAdi}' pazar görünürlük profili oluşturuldu.`;

  const localFallbackLog: TerminalLogEntry[] = llmResult.usedLocalDataFallback
    ? [
        {
          id: "log-fallback-ag",
          timestamp: formatTimestamp(2800),
          category: "AĞ",
          message: LOCAL_DATA_FALLBACK_NETWORK_LOG,
        },
      ]
    : [];

  const baitLogs: TerminalLogEntry[] = [
    {
      id: "log-5",
      timestamp: formatTimestamp(7200),
      category: "YEMLEME",
      message: `${sehir} ${sektor} için semantik kelime varyasyonları optimize edildi. ${baitDeployment.totalBaits} adet LSI bloğu sentezlendi.`,
    },
    {
      id: "log-6",
      timestamp: formatTimestamp(8400),
      category: "DAĞITIM",
      message: `${redditCount} adet Reddit yapay zeka tarayıcı endeksi güncellendi. ${markaAdi} kalıcı hafızaya işleniyor.`,
    },
    {
      id: "log-7",
      timestamp: formatTimestamp(9600),
      category: "AĞ",
      message: `Üretilen ${baitDeployment.totalBaits} adet Yapay Zeka Yemi NexisAI Dijital Veri Ağına pompalanıyor... Toplam ${baitDeployment.totalDeployed} dağıtım noktası aktifleştirildi.`,
    },
  ];

  const segmentLogs: TerminalLogEntry[] = [
    {
      id: "log-deploy-blog",
      timestamp: formatTimestamp(10800),
      category: "DAĞITIM",
      message: `${blogCount} adet Yerel Blog Ağı segmenti tetiklendi.`,
    },
    {
      id: "log-deploy-forum",
      timestamp: formatTimestamp(11400),
      category: "DAĞITIM",
      message: `${forumCount} adet Semantik Forum Dizini güncellendi.`,
    },
    {
      id: "log-deploy-medium",
      timestamp: formatTimestamp(12000),
      category: "DAĞITIM",
      message: `${mediumCount} adet Medium Teknoloji Kanalına yem enjekte edildi.`,
    },
  ];

  const deploymentDetailLogs: TerminalLogEntry[] =
    baitDeployment.deployments.map((deployment, index) => ({
      id: `log-deploy-detail-${deployment.networkId}`,
      timestamp: formatTimestamp(12600 + index * 400),
      category: "DAĞITIM" as const,
      message: getDeploymentLogMessage(deployment),
    }));

  const closingLogs: TerminalLogEntry[] = [
    {
      id: "log-8",
      timestamp: formatTimestamp(14200),
      category: "YEMLEME",
      message: `${formattedBudget} ₺ bütçe ile ${sehir} bölgesindeki dijital ağlara Yapay Zeka Yemleri (AI-Baits) aktifleştirildi. Güven skoru: %${llmResult.confidence}`,
    },
    {
      id: "log-9",
      timestamp: formatTimestamp(15400),
      category: "BAŞARI",
      message: `Optimizasyon döngüsü başlatıldı. ${gunSayisi} gün boyunca NexisAI motoru interneti ${markaAdi} lehine manipüle edecek!`,
    },
  ];

  return [
    {
      id: "log-1",
      timestamp: formatTimestamp(0),
      category: "SİSTEM",
      message: `NexisAI Algoritması tetiklendi. Hedef bölge: ${sehir}, Hedef Sektör: ${sektor}...`,
    },
    {
      id: "log-2",
      timestamp: formatTimestamp(1800),
      category: "ARAMA",
      message: aramaMessage,
    },
    ...localFallbackLog,
    {
      id: "log-3",
      timestamp: formatTimestamp(3600),
      category: "ANALİZ",
      message: analizMessage,
    },
    {
      id: "log-4",
      timestamp: formatTimestamp(5400),
      category: "TESPİT",
      message: tespitOzetMessage,
    },
    {
      id: "log-4-karar",
      timestamp: formatTimestamp(5600),
      category: "TESPİT",
      message: `Yapay zeka kararı: ${yapayZekaKarari}`,
    },
    ...baitLogs,
    ...segmentLogs,
    ...deploymentDetailLogs,
    ...closingLogs,
  ];
}
