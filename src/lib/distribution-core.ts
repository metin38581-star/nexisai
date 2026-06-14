import { buildGeoPostTitle } from "@/lib/geo-prompt";

export type DistributionPhase = "idle" | "started" | "publishing" | "completed";

export interface DistributionProgressEvent {
  progress: number;
  phase: DistributionPhase;
  currentIndex: number;
  totalCount: number;
  /** Terminalde gösterilecek mesaj (kategori ayrı eklenir). */
  terminalMessage: string;
}

export type DistributionProgressListener = (
  event: DistributionProgressEvent,
) => void;

/** Merkezi GEO webhook'una gönderilen kurumsal dağıtım paketi. */
export interface GeoWebhookPayload {
  baslik: string;
  icerik: string;
  slug: string;
  markaAdi: string;
  sehir: string;
  sektor: string;
  agresiflik: string;
}

export interface GeoDistributionArticle {
  baslik: string;
  icerik: string;
  slug: string;
}

export interface GeoDistributionContext {
  campaignId: string;
  markaAdi: string;
  sehir: string;
  sektor: string;
  agresiflik: string;
}

export type GeoWebhookDispatchResult = {
  ok: boolean;
  externalLiveUrl?: string;
};

export type GeoWebhookDispatcher = (
  payload: GeoWebhookPayload,
) => Promise<GeoWebhookDispatchResult>;

const DEFAULT_LATENCY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatSektorForLog(sektor: string): string {
  return sektor.split("&")[0].trim().toLocaleLowerCase("tr-TR");
}

export function buildPostTitle(sehir: string, sektor: string): string {
  return buildGeoPostTitle(sehir, sektor, 0);
}

export function buildGeoWebhookPayload(
  article: GeoDistributionArticle,
  context: GeoDistributionContext,
): GeoWebhookPayload {
  return {
    baslik: article.baslik,
    icerik: article.icerik,
    slug: article.slug,
    markaAdi: context.markaAdi,
    sehir: context.sehir,
    sektor: context.sektor,
    agresiflik: context.agresiflik,
  };
}

export function buildDistributionTerminalMessage(
  sehir: string,
  sektor: string,
  currentIndex: number,
  totalCount: number,
): string {
  const sektorLabel = formatSektorForLog(sektor);
  return `${sehir} ${sektorLabel} makalesi Make.com webhook'una iletildi... (${currentIndex}/${totalCount})`;
}

function resolveProgressMilestone(completed: number, total: number): number {
  if (total <= 0 || completed <= 0) {
    return 0;
  }

  if (total === 3) {
    return [33, 66, 100][completed - 1] ?? 100;
  }

  return Math.round((completed / total) * 100);
}

/**
 * Çoklu makale dağıtım hattı — her makale için Merkezi GEO webhook dispatch
 * fonksiyonunu sırayla çalıştırır ve ilerleme olaylarını yayınlar.
 */
export async function runMultiDistributionPipeline(
  articles: GeoDistributionArticle[],
  context: GeoDistributionContext,
  dispatch: GeoWebhookDispatcher,
  onProgress: DistributionProgressListener,
  options?: {
    latencyMs?: number;
    onArticleResult?: (
      index: number,
      result: GeoWebhookDispatchResult,
    ) => void | Promise<void>;
  },
): Promise<void> {
  const articleCount = articles.length;
  if (articleCount <= 0) {
    return;
  }

  const { sehir, sektor } = context;
  const latencyMs = options?.latencyMs ?? DEFAULT_LATENCY_MS;

  onProgress({
    progress: 0,
    phase: "started",
    currentIndex: 0,
    totalCount: articleCount,
    terminalMessage: `${sehir} ${formatSektorForLog(sektor)} kampanyası için Make.com dağıtım webhook'u tetiklendi...`,
  });

  for (let index = 0; index < articleCount; index++) {
    const article = articles[index];
    if (!article) {
      continue;
    }

    const payload = buildGeoWebhookPayload(article, context);
    const result = await dispatch(payload);
    await options?.onArticleResult?.(index, result);

    if (latencyMs > 0) {
      await sleep(latencyMs);
    }

    const completed = index + 1;
    onProgress({
      progress: resolveProgressMilestone(completed, articleCount),
      phase: "publishing",
      currentIndex: completed,
      totalCount: articleCount,
      terminalMessage: buildDistributionTerminalMessage(
        sehir,
        sektor,
        completed,
        articleCount,
      ),
    });
  }

  onProgress({
    progress: 100,
    phase: "completed",
    currentIndex: articleCount,
    totalCount: articleCount,
    terminalMessage: `Make.com webhook'una ${articleCount} makale başarıyla iletildi. Çoklu dağıtım tamamlandı.`,
  });
}

/** Dashboard UI ilerleme simülasyonu (istemci tarafı). */
export async function runDistributionSimulation(
  articleCount: number,
  sehir: string,
  sektor: string,
  onProgress: DistributionProgressListener,
  options?: {
    latencyMs?: number;
    onEachArticle?: (index: number) => void | Promise<void>;
  },
): Promise<void> {
  if (articleCount <= 0) {
    return;
  }

  const latencyMs = options?.latencyMs ?? DEFAULT_LATENCY_MS;

  onProgress({
    progress: 0,
    phase: "started",
    currentIndex: 0,
    totalCount: articleCount,
    terminalMessage: `${sehir} ${formatSektorForLog(sektor)} ağına GEO makale dağıtımı başlatıldı...`,
  });

  for (let index = 0; index < articleCount; index++) {
    await options?.onEachArticle?.(index);

    if (latencyMs > 0) {
      await sleep(latencyMs);
    }

    const completed = index + 1;
    onProgress({
      progress: resolveProgressMilestone(completed, articleCount),
      phase: "publishing",
      currentIndex: completed,
      totalCount: articleCount,
      terminalMessage: buildDistributionTerminalMessage(
        sehir,
        sektor,
        completed,
        articleCount,
      ),
    });
  }

  onProgress({
    progress: 100,
    phase: "completed",
    currentIndex: articleCount,
    totalCount: articleCount,
    terminalMessage: `Make.com webhook'una ${articleCount} makale iletildi. Dağıtım tamamlandı.`,
  });
}
