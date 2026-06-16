import "server-only";

import type { SelectedQuestionPair } from "@/lib/selected-questions";
import { prisma } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hasDatabaseUrl } from "@/lib/server-env";

interface BaitRef {
  id: string;
}

export async function attachCampaignIntents(
  campaignId: string,
  questionPairs: SelectedQuestionPair[],
  baits: BaitRef[],
): Promise<void> {
  if (questionPairs.length === 0 || baits.length === 0) {
    return;
  }

  const rows = questionPairs.map((pair, index) => ({
    question: pair.question,
    simulatedAnswer: pair.simulatedAnswer,
    sortOrder: index,
    baitId: baits[index]?.id ?? null,
  }));

  if (hasDatabaseUrl()) {
    try {
      await prisma.campaignIntent.createMany({
        data: rows.map((row) => ({
          campaignId,
          question: row.question,
          simulatedAnswer: row.simulatedAnswer,
          sortOrder: row.sortOrder,
          baitId: row.baitId,
        })),
      });
      return;
    } catch (error) {
      console.error("[CAMPAIGN_INTENT]: Prisma intent kaydı hatası:", error);
    }
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("CampaignIntent").insert(
    rows.map((row) => ({
      id: crypto.randomUUID(),
      campaignId,
      question: row.question,
      simulatedAnswer: row.simulatedAnswer,
      sortOrder: row.sortOrder,
      baitId: row.baitId,
      createdAt: new Date().toISOString(),
    })),
  );

  if (error) {
    console.error("[CAMPAIGN_INTENT]: Supabase intent kaydı hatası:", error);
  }
}
