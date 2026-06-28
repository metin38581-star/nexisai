import "server-only";

import type { CampaignResponse, TerminalLogEntry } from "@/types/campaign";
import {
  CAMPAIGN_DISTRIBUTION_TIMEOUT_MS,
  CAMPAIGN_PIPELINE_STALE_MS,
  DISTRIBUTION_INTERRUPTED_MESSAGE,
} from "@/lib/campaign-distribution-timeout";
import { prisma } from "@/lib/db";
import { hasDatabaseUrl } from "@/lib/server-env";

export type CampaignProcessingStatus =
  | "started"
  | "processing"
  | "complete"
  | "failed"
  | "interrupted";

export interface CampaignProcessingState {
  campaignId: string;
  status: CampaignProcessingStatus;
  terminalLogs: TerminalLogEntry[];
  result: Partial<CampaignResponse> | null;
  updatedAt: string;
}

let processingTableEnsured = false;

async function ensureCampaignProcessingTable(): Promise<void> {
  if (processingTableEnsured || !hasDatabaseUrl()) {
    return;
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CampaignProcessingState" (
        "campaign_id" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'started',
        "logs" JSONB NOT NULL DEFAULT '[]',
        "result" JSONB,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CampaignProcessingState_pkey" PRIMARY KEY ("campaign_id")
      );
      CREATE INDEX IF NOT EXISTS "CampaignProcessingState_status_idx"
        ON "CampaignProcessingState"("status");
    `);
    processingTableEnsured = true;
  } catch (error) {
    console.error("[CAMPAIGN_PROCESSING]: Tablo oluşturulamadı:", error);
  }
}

function parseLogs(value: unknown): TerminalLogEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is TerminalLogEntry =>
      Boolean(entry) &&
      typeof entry === "object" &&
      typeof (entry as TerminalLogEntry).id === "string" &&
      typeof (entry as TerminalLogEntry).message === "string",
  );
}

export async function initCampaignProcessingState(
  campaignId: string,
  initialLogs: TerminalLogEntry[],
): Promise<void> {
  await ensureCampaignProcessingTable();

  try {
    await prisma.$executeRaw`
      INSERT INTO "CampaignProcessingState" ("campaign_id", "status", "logs", "updated_at")
      VALUES (${campaignId}, 'started', ${JSON.stringify(initialLogs)}::jsonb, NOW())
      ON CONFLICT ("campaign_id") DO UPDATE SET
        "status" = 'started',
        "logs" = ${JSON.stringify(initialLogs)}::jsonb,
        "result" = NULL,
        "updated_at" = NOW()
    `;
  } catch (error) {
    console.error("[CAMPAIGN_PROCESSING]: Başlangıç durumu yazılamadı:", error);
  }
}

export async function appendCampaignTerminalLogs(
  campaignId: string,
  entries: TerminalLogEntry[],
): Promise<void> {
  if (entries.length === 0) {
    return;
  }

  await ensureCampaignProcessingTable();

  try {
    const current = await getCampaignProcessingState(campaignId);
    const merged = [...(current?.terminalLogs ?? []), ...entries];

    await prisma.$executeRaw`
      INSERT INTO "CampaignProcessingState" ("campaign_id", "status", "logs", "updated_at")
      VALUES (${campaignId}, 'processing', ${JSON.stringify(merged)}::jsonb, NOW())
      ON CONFLICT ("campaign_id") DO UPDATE SET
        "status" = 'processing',
        "logs" = ${JSON.stringify(merged)}::jsonb,
        "updated_at" = NOW()
    `;
  } catch (error) {
    console.error("[CAMPAIGN_PROCESSING]: Log eklenemedi:", error);
  }
}

export async function completeCampaignProcessingState(
  campaignId: string,
  terminalLogs: TerminalLogEntry[],
  result: Partial<CampaignResponse>,
): Promise<void> {
  await ensureCampaignProcessingTable();

  try {
    await prisma.$executeRaw`
      INSERT INTO "CampaignProcessingState" ("campaign_id", "status", "logs", "result", "updated_at")
      VALUES (
        ${campaignId},
        'complete',
        ${JSON.stringify(terminalLogs)}::jsonb,
        ${JSON.stringify(result)}::jsonb,
        NOW()
      )
      ON CONFLICT ("campaign_id") DO UPDATE SET
        "status" = 'complete',
        "logs" = ${JSON.stringify(terminalLogs)}::jsonb,
        "result" = ${JSON.stringify(result)}::jsonb,
        "updated_at" = NOW()
    `;
  } catch (error) {
    console.error("[CAMPAIGN_PROCESSING]: Tamamlanma durumu yazılamadı:", error);
  }
}

export function isCampaignProcessingStale(
  state: CampaignProcessingState,
  now = Date.now(),
): boolean {
  if (state.status !== "started" && state.status !== "processing") {
    return false;
  }

  const updatedAt = new Date(state.updatedAt).getTime();
  if (!Number.isFinite(updatedAt)) {
    return false;
  }

  const elapsed = now - updatedAt;
  const lastLog = state.terminalLogs[state.terminalLogs.length - 1];
  const inDistributionPhase =
    lastLog?.category === "DAĞITIM" ||
    (typeof lastLog?.message === "string" &&
      lastLog.message.includes("[DAĞITIM]"));

  if (inDistributionPhase && elapsed >= CAMPAIGN_DISTRIBUTION_TIMEOUT_MS) {
    return true;
  }

  return elapsed >= CAMPAIGN_PIPELINE_STALE_MS;
}

export async function interruptCampaignProcessingState(
  campaignId: string,
  terminalLogs: TerminalLogEntry[],
  errorMessage: string = DISTRIBUTION_INTERRUPTED_MESSAGE,
): Promise<void> {
  await ensureCampaignProcessingTable();

  const logs = [
    ...terminalLogs,
    {
      id: `interrupt-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      category: "HATA" as const,
      message: `⚠️ [SİBER HATA]: ${errorMessage}`,
    },
  ];

  try {
    await prisma.$executeRaw`
      INSERT INTO "CampaignProcessingState" ("campaign_id", "status", "logs", "updated_at")
      VALUES (${campaignId}, 'interrupted', ${JSON.stringify(logs)}::jsonb, NOW())
      ON CONFLICT ("campaign_id") DO UPDATE SET
        "status" = 'interrupted',
        "logs" = ${JSON.stringify(logs)}::jsonb,
        "updated_at" = NOW()
    `;
  } catch (error) {
    console.error("[CAMPAIGN_PROCESSING]: Kesinti durumu yazılamadı:", error);
  }
}

export async function failCampaignProcessingState(
  campaignId: string,
  terminalLogs: TerminalLogEntry[],
  errorMessage: string,
): Promise<void> {
  await ensureCampaignProcessingTable();

  const logs = [
    ...terminalLogs,
    {
      id: `fail-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      category: "HATA" as const,
      message: `⚠️ [SİBER HATA]: ${errorMessage}`,
    },
  ];

  try {
    await prisma.$executeRaw`
      INSERT INTO "CampaignProcessingState" ("campaign_id", "status", "logs", "updated_at")
      VALUES (${campaignId}, 'failed', ${JSON.stringify(logs)}::jsonb, NOW())
      ON CONFLICT ("campaign_id") DO UPDATE SET
        "status" = 'failed',
        "logs" = ${JSON.stringify(logs)}::jsonb,
        "updated_at" = NOW()
    `;
  } catch (error) {
    console.error("[CAMPAIGN_PROCESSING]: Hata durumu yazılamadı:", error);
  }
}

export async function getCampaignProcessingState(
  campaignId: string,
): Promise<CampaignProcessingState | null> {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureCampaignProcessingTable();

  try {
    const rows = await prisma.$queryRaw<
      Array<{
        campaign_id: string;
        status: string;
        logs: unknown;
        result: unknown;
        updated_at: Date;
      }>
    >`
      SELECT "campaign_id", "status", "logs", "result", "updated_at"
      FROM "CampaignProcessingState"
      WHERE "campaign_id" = ${campaignId}
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      campaignId: row.campaign_id,
      status: row.status as CampaignProcessingStatus,
      terminalLogs: parseLogs(row.logs),
      result:
        row.result && typeof row.result === "object"
          ? (row.result as Partial<CampaignResponse>)
          : null,
      updatedAt: row.updated_at.toISOString(),
    };
  } catch (error) {
    console.error("[CAMPAIGN_PROCESSING]: Durum okunamadı:", error);
    return null;
  }
}
