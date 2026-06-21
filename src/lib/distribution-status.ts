import "server-only";

export type DominanceChannel =
  | "telegraph"
  | "github_pages"
  | "nostr"
  | "wordpress";

export interface ChannelPublicationRecord {
  baitId: string;
  slug: string;
  campaignId?: string;
  channel: DominanceChannel;
  ok: boolean;
  url?: string;
  eventId?: string;
  error?: string;
  publishedAt: string;
}

export interface BaitDistributionStatus {
  baitId: string;
  slug: string;
  campaignId?: string;
  channels: ChannelPublicationRecord[];
  successCount: number;
  updatedAt: string;
}

const publicationStore = new Map<string, BaitDistributionStatus>();

function baitKey(baitId: string): string {
  return baitId;
}

export function recordChannelPublication(
  record: Omit<ChannelPublicationRecord, "publishedAt">,
): ChannelPublicationRecord {
  const entry: ChannelPublicationRecord = {
    ...record,
    publishedAt: new Date().toISOString(),
  };

  const key = baitKey(record.baitId);
  const existing = publicationStore.get(key);

  if (existing) {
    const channels = [
      ...existing.channels.filter((item) => item.channel !== record.channel),
      entry,
    ];
    publicationStore.set(key, {
      baitId: record.baitId,
      slug: record.slug,
      campaignId: record.campaignId ?? existing.campaignId,
      channels,
      successCount: channels.filter((item) => item.ok).length,
      updatedAt: entry.publishedAt,
    });
  } else {
    publicationStore.set(key, {
      baitId: record.baitId,
      slug: record.slug,
      campaignId: record.campaignId,
      channels: [entry],
      successCount: entry.ok ? 1 : 0,
      updatedAt: entry.publishedAt,
    });
  }

  return entry;
}

export function getDistributionStatusByBait(
  baitId: string,
): BaitDistributionStatus | null {
  return publicationStore.get(baitKey(baitId)) ?? null;
}

export function getDistributionStatusByCampaign(
  campaignId: string,
): BaitDistributionStatus[] {
  return Array.from(publicationStore.values()).filter(
    (status) => status.campaignId === campaignId,
  );
}

export function listDominanceNetworkStatus(): BaitDistributionStatus[] {
  return Array.from(publicationStore.values()).sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export function summarizeDominanceNetwork(): {
  totalBaits: number;
  telegraph: number;
  githubPages: number;
  nostr: number;
} {
  const statuses = listDominanceNetworkStatus();
  let telegraph = 0;
  let githubPages = 0;
  let nostr = 0;

  for (const status of statuses) {
    for (const channel of status.channels) {
      if (!channel.ok) {
        continue;
      }
      if (channel.channel === "telegraph") {
        telegraph += 1;
      }
      if (channel.channel === "github_pages") {
        githubPages += 1;
      }
      if (channel.channel === "nostr") {
        nostr += 1;
      }
    }
  }

  return {
    totalBaits: statuses.length,
    telegraph,
    githubPages,
    nostr,
  };
}
