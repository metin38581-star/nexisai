import "server-only";

import { prisma } from "@/lib/db";
import { DbOperationTimeoutError, withDbTimeout } from "@/lib/db-timeout";
import { generateForumThreadForEntry, type ForumThreadComment } from "@/lib/forum-answer-engine";
import { buildQuestionHubSlug } from "@/lib/question-hub-slug";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hasDatabaseUrl, hasSupabaseAdminEnv } from "@/lib/server-env";
import type { BusinessSector } from "@/types/campaign";

/** Pooler kilitlerinde Prisma'nin askida kalmasini onlemek icin kisa timeout. */
const PRISMA_HUB_TIMEOUT_MS = 5_000;

export interface QuestionHubEntry {
  coreQuestionId: string;
  question: string;
  simulatedAnswer: string;
  city: string;
  sectorLabel: string;
  sectorSlug?: BusinessSector | "";
}

export interface HubAnswerView {
  id: string;
  username: string;
  content: string;
  upvotes: number;
  isFeatured: boolean;
  createdAt: string;
  campaignId: string;
}

export interface QuestionHubView {
  id: string;
  slug: string;
  question: string;
  coreQuestionId: string | null;
  createdAt: string;
  answers: HubAnswerView[];
}

type PrismaHubResult<T> =
  | { status: "success"; data: T }
  | { status: "not_found" }
  | { status: "failed" };

function logPrismaHubFailure(context: string, error: unknown): void {
  if (error instanceof DbOperationTimeoutError) {
    console.warn(
      `[QUESTION_HUB]: Prisma ${context} zaman asimi (${PRISMA_HUB_TIMEOUT_MS}ms) — Supabase fallback.`,
    );
    return;
  }

  console.error(`[QUESTION_HUB]: Prisma ${context} hatasi:`, error);
}

async function resolveForumThreadForEntry(input: {
  question: string;
  brandName: string;
  city: string;
  sectorLabel: string;
  sectorSlug?: BusinessSector | "";
  simulatedAnswer: string;
  seedKey: string;
}): Promise<ForumThreadComment[]> {
  return generateForumThreadForEntry({
    question: input.question,
    brandName: input.brandName,
    city: input.city,
    sectorLabel: input.sectorLabel,
    sectorSlug: input.sectorSlug,
    simulatedAnswer: input.simulatedAnswer,
    seedKey: input.seedKey,
  });
}

async function runPrismaHubAttempt<T>(
  context: string,
  operation: () => Promise<T | null>,
): Promise<PrismaHubResult<T>> {
  if (!hasDatabaseUrl()) {
    return { status: "failed" };
  }

  try {
    const data = await withDbTimeout(
      operation(),
      PRISMA_HUB_TIMEOUT_MS,
      `question_hub:${context}`,
    );

    if (data === null) {
      return { status: "not_found" };
    }

    return { status: "success", data };
  } catch (error) {
    logPrismaHubFailure(context, error);
    return { status: "failed" };
  }
}

async function upsertQuestionHubViaPrisma(
  slug: string,
  question: string,
  coreQuestionId: string,
): Promise<string | null> {
  const result = await runPrismaHubAttempt("hub upsert", async () => {
    const hub = await prisma.questionHub.upsert({
      where: { slug },
      create: {
        slug,
        question,
        coreQuestionId,
      },
      update: {
        question,
        coreQuestionId,
      },
      select: { id: true },
    });

    return hub.id;
  });

  if (result.status === "success") {
    return result.data;
  }

  return null;
}

async function clearHubAnswersForQuestionViaPrisma(
  questionId: string,
  campaignId: string,
): Promise<boolean> {
  const result = await runPrismaHubAttempt("cevap temizle", async () => {
    await prisma.hubAnswer.deleteMany({
      where: { questionId, campaignId },
    });
    return true;
  });

  return result.status === "success";
}

async function clearHubAnswersForQuestionViaSupabase(
  questionId: string,
  campaignId: string,
): Promise<void> {
  if (!hasSupabaseAdminEnv()) {
    return;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("HubAnswer")
    .delete()
    .eq("question_id", questionId)
    .eq("campaign_id", campaignId);

  if (error) {
    console.error("[QUESTION_HUB]: Supabase cevap temizleme hatasi:", error);
  }
}

async function resolveQuestionHubId(
  slug: string,
  question: string,
  coreQuestionId: string,
): Promise<string | null> {
  if (hasDatabaseUrl()) {
    const prismaId = await upsertQuestionHubViaPrisma(
      slug,
      question,
      coreQuestionId,
    );
    if (prismaId) {
      return prismaId;
    }
  }

  return upsertQuestionHubViaSupabase(slug, question, coreQuestionId);
}

export interface QuestionHubPublishResult {
  publishedSlugs: string[];
  failedCount: number;
}

async function clearHubAnswersForQuestion(
  questionId: string,
  campaignId: string,
): Promise<boolean> {
  if (hasDatabaseUrl()) {
    const cleared = await clearHubAnswersForQuestionViaPrisma(
      questionId,
      campaignId,
    );
    if (cleared) {
      return true;
    }
  }

  if (hasSupabaseAdminEnv()) {
    await clearHubAnswersForQuestionViaSupabase(questionId, campaignId);
    return true;
  }

  return false;
}

async function createHubAnswersBatchViaPrisma(
  questionId: string,
  campaignId: string,
  comments: ForumThreadComment[],
): Promise<boolean> {
  if (comments.length === 0) {
    return false;
  }

  const result = await runPrismaHubAttempt("cevap batch insert", async () => {
    await prisma.hubAnswer.createMany({
      data: comments.map((comment) => ({
        questionId,
        campaignId,
        username: comment.username,
        content: comment.content,
        isFeatured: comment.isFeatured,
      })),
    });

    return true;
  });

  return result.status === "success";
}

async function createHubAnswersBatchViaSupabase(
  questionId: string,
  campaignId: string,
  comments: ForumThreadComment[],
): Promise<void> {
  if (!hasSupabaseAdminEnv() || comments.length === 0) {
    console.warn("[QUESTION_HUB]: Supabase admin env eksik — cevap yazilamadi.");
    return;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("HubAnswer").insert(
    comments.map((comment) => ({
      id: crypto.randomUUID(),
      question_id: questionId,
      campaign_id: campaignId,
      username: comment.username,
      content: comment.content,
      upvotes: 0,
      is_featured: comment.isFeatured,
      createdAt: new Date().toISOString(),
    })),
  );

  if (error) {
    console.error("[QUESTION_HUB]: Supabase batch cevap kaydi hatasi:", error);
  }
}

async function persistHubAnswers(input: {
  questionId: string;
  campaignId: string;
  comments: ForumThreadComment[];
}): Promise<boolean> {
  if (input.comments.length === 0) {
    return false;
  }

  await clearHubAnswersForQuestion(input.questionId, input.campaignId);

  if (hasDatabaseUrl()) {
    const prismaOk = await createHubAnswersBatchViaPrisma(
      input.questionId,
      input.campaignId,
      input.comments,
    );

    if (prismaOk) {
      return true;
    }
  }

  if (hasSupabaseAdminEnv()) {
    await createHubAnswersBatchViaSupabase(
      input.questionId,
      input.campaignId,
      input.comments,
    );
    return true;
  }

  return false;
}

async function upsertQuestionHubViaSupabase(
  slug: string,
  question: string,
  coreQuestionId: string,
): Promise<string | null> {
  if (!hasSupabaseAdminEnv()) {
    console.warn("[QUESTION_HUB]: Supabase admin env eksik — hub yazilamadi.");
    return null;
  }

  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchError } = await supabase
    .from("QuestionHub")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (fetchError) {
    console.error("[QUESTION_HUB]: Supabase hub fetch hatasi:", fetchError);
    return null;
  }

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("QuestionHub")
      .update({
        question,
        core_question_id: coreQuestionId,
      })
      .eq("id", existing.id);

    if (updateError) {
      console.error(
        "[QUESTION_HUB]: Supabase hub guncelleme hatasi:",
        updateError,
      );
      return null;
    }

    return existing.id;
  }

  const id = crypto.randomUUID();
  const { error: insertError } = await supabase.from("QuestionHub").insert({
    id,
    slug,
    question,
    core_question_id: coreQuestionId,
    createdAt: new Date().toISOString(),
  });

  if (insertError) {
    console.error("[QUESTION_HUB]: Supabase hub insert hatasi:", insertError);
    return null;
  }

  return id;
}

async function fetchQuestionHubViaPrisma(
  slug: string,
): Promise<QuestionHubView | null> {
  const hub = await prisma.questionHub.findUnique({
    where: { slug },
    include: {
      answers: {
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!hub) {
    return null;
  }

  return {
    id: hub.id,
    slug: hub.slug,
    question: hub.question,
    coreQuestionId: hub.coreQuestionId,
    createdAt: hub.createdAt.toISOString(),
    answers: hub.answers.map((answer) => ({
      id: answer.id,
      username: answer.username,
      content: answer.content,
      upvotes: answer.upvotes,
      isFeatured: answer.isFeatured,
      createdAt: answer.createdAt.toISOString(),
      campaignId: answer.campaignId,
    })),
  };
}

async function fetchQuestionHubViaSupabase(
  slug: string,
): Promise<QuestionHubView | null> {
  if (!hasSupabaseAdminEnv()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data: hub, error: hubError } = await supabase
    .from("QuestionHub")
    .select("id, slug, question, core_question_id, createdAt")
    .eq("slug", slug)
    .maybeSingle();

  if (hubError || !hub) {
    if (hubError) {
      console.error("[QUESTION_HUB]: Supabase hub fetch hatasi:", hubError);
    }
    return null;
  }

  const { data: answers, error: answersError } = await supabase
    .from("HubAnswer")
    .select(
      "id, username, content, upvotes, is_featured, createdAt, campaign_id",
    )
    .eq("question_id", hub.id)
    .order("is_featured", { ascending: false })
    .order("createdAt", { ascending: false });

  if (answersError) {
    console.error("[QUESTION_HUB]: Supabase cevap fetch hatasi:", answersError);
    return null;
  }

  return {
    id: hub.id,
    slug: hub.slug,
    question: hub.question,
    coreQuestionId: hub.core_question_id ?? null,
    createdAt: hub.createdAt,
    answers: (answers ?? []).map((answer) => ({
      id: answer.id,
      username: answer.username,
      content: answer.content,
      upvotes: answer.upvotes ?? 0,
      isFeatured: Boolean(answer.is_featured),
      createdAt: answer.createdAt,
      campaignId: answer.campaign_id,
    })),
  };
}

export async function appendCampaignAnswersToQuestionHub(input: {
  campaignId: string;
  brandName: string;
  entries: QuestionHubEntry[];
}): Promise<QuestionHubPublishResult> {
  const publishedSlugs: string[] = [];
  let failedCount = 0;

  if (input.entries.length === 0) {
    return { publishedSlugs, failedCount };
  }

  if (!hasDatabaseUrl() && !hasSupabaseAdminEnv()) {
    console.warn(
      "[QUESTION_HUB]: DATABASE_URL ve Supabase admin birlikte eksik — hub atlandi.",
    );
    return { publishedSlugs, failedCount: input.entries.length };
  }

  const validEntries = input.entries.filter((entry) =>
    entry.question.trim(),
  );

  await Promise.all(
    validEntries.map(async (entry) => {
      const slug = buildQuestionHubSlug(entry.question);
      if (!slug) {
        failedCount += 1;
        return;
      }

      const seedKey = `${input.campaignId}-${entry.coreQuestionId}`;

      try {
        const thread = await resolveForumThreadForEntry({
          question: entry.question,
          brandName: input.brandName,
          city: entry.city,
          sectorLabel: entry.sectorLabel,
          sectorSlug: entry.sectorSlug,
          simulatedAnswer: entry.simulatedAnswer,
          seedKey,
        });

        const questionHubId = await resolveQuestionHubId(
          slug,
          entry.question,
          entry.coreQuestionId,
        );

        if (!questionHubId) {
          failedCount += 1;
          return;
        }

        const persisted = await persistHubAnswers({
          questionId: questionHubId,
          campaignId: input.campaignId,
          comments: thread,
        });

        if (persisted) {
          publishedSlugs.push(slug);
          return;
        }

        failedCount += 1;
      } catch (error) {
        failedCount += 1;
        console.error(
          `[QUESTION_HUB]: Hub kaydi atlandi (campaign=${input.campaignId}, slug=${slug}):`,
          error,
        );
      }
    }),
  );

  failedCount += input.entries.length - validEntries.length;

  return { publishedSlugs, failedCount };
}

export async function fetchQuestionHubBySlug(
  slug: string,
): Promise<QuestionHubView | null> {
  const prismaAttempt = await runPrismaHubAttempt("hub fetch", () =>
    fetchQuestionHubViaPrisma(slug),
  );

  if (prismaAttempt.status === "success") {
    return prismaAttempt.data;
  }

  if (prismaAttempt.status === "not_found") {
    return fetchQuestionHubViaSupabase(slug);
  }

  if (hasSupabaseAdminEnv()) {
    return fetchQuestionHubViaSupabase(slug);
  }

  return null;
}

export async function fetchAllQuestionHubSlugs(): Promise<
  Array<{ slug: string; createdAt: Date }>
> {
  const prismaAttempt = await runPrismaHubAttempt("slug listesi", async () => {
    const rows = await prisma.questionHub.findMany({
      select: { slug: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    return rows;
  });

  if (prismaAttempt.status === "success" && prismaAttempt.data.length > 0) {
    const merged = new Map(
      prismaAttempt.data.map((row) => [row.slug, row]),
    );

    if (hasSupabaseAdminEnv()) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("QuestionHub")
        .select("slug, createdAt")
        .order("createdAt", { ascending: false });

      if (!error) {
        for (const row of data ?? []) {
          if (!merged.has(row.slug as string)) {
            merged.set(row.slug as string, {
              slug: row.slug as string,
              createdAt: new Date(row.createdAt as string),
            });
          }
        }
      }
    }

    return Array.from(merged.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  if (!hasSupabaseAdminEnv()) {
    return prismaAttempt.status === "success" ? prismaAttempt.data : [];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("QuestionHub")
    .select("slug, createdAt")
    .order("createdAt", { ascending: false });

  if (error) {
    console.error("[QUESTION_HUB]: Supabase slug listesi hatasi:", error);
    return prismaAttempt.status === "success" ? prismaAttempt.data : [];
  }

  return (data ?? []).map((row) => ({
    slug: row.slug,
    createdAt: new Date(row.createdAt),
  }));
}
