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

const DEFAULT_LATENCY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatSektorForLog(sektor: string): string {
  return sektor.split("&")[0].trim().toLocaleLowerCase("tr-TR");
}

export function buildPostTitle(sehir: string, sektor: string): string {
  return `${sehir} En İyi ${sektor} Tavsiyesi`;
}

export function buildDistributionTerminalMessage(
  sehir: string,
  sektor: string,
  currentIndex: number,
  totalCount: number,
): string {
  const sektorLabel = formatSektorForLog(sektor);
  return `${sehir} ${sektorLabel} makalesi yayınlandı... (${currentIndex}/${totalCount})`;
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
    terminalMessage: `${sehir} ${formatSektorForLog(sektor)} ağına gizli makale enjeksiyonu başlatıldı...`,
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
    terminalMessage: `PBN ağına ${articleCount} makale başarıyla enjekte edildi. Dağıtım tamamlandı.`,
  });
}
