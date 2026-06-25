import "server-only";

import { prisma } from "@/lib/db";
import { DbOperationTimeoutError, withDbTimeout } from "@/lib/db-timeout";
import { generateForumAnswerForEntry } from "@/lib/forum-answer-engine";
import { buildForumAnswerContent } from "@/lib/forum-answer-prompt";
import { generateForumUsername } from "@/lib/forum-username";
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

async function resolveForumAnswerContent(input: {
  question: string;
  brandName: string;
  city: string;
  sectorLabel: string;
  sectorSlug?: BusinessSector | "";
  simulatedAnswer: string;
}): Promise<string> {
  try {
    return await generateForumAnswerForEntry({
      question: input.question,
      brandName: input.brandName,
      city: input.city,
      sectorLabel: input.sectorLabel,
      sectorSlug: input.sectorSlug,
      simulatedAnswer: input.simulatedAnswer,
    });
  } catch (error) {
    console.warn("[QUESTION_HUB]: Forum cevap uretimi basarisiz, sablon kullaniliyor:", error);
    return buildForumAnswerContent({
      question: input.question,
      brandName: input.brandName,
      city: input.city,
      sectorLabel: input.sectorLabel,
      sectorSlug: input.sectorSlug,
      simulatedAnswer: input.simulatedAnswer,
    });
  }
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

async function createHubAnswerViaPrisma(input: {
  questionId: string;
  campaignId: string;
  username: string;
  content: string;
  isFeatured: boolean;
}): Promise<boolean> {
  const result = await runPrismaHubAttempt("cevap insert", async () => {
    await prisma.hubAnswer.create({
      data: {
        questionId: input.questionId,
        campaignId: input.campaignId,
        username: input.username,
        content: input.content,
        isFeatured: input.isFeatured,
      },
    });

    return true;
  });

  return result.status === "success";
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

async function createHubAnswerViaSupabase(input: {
  questionId: string;
  campaignId: string;
  username: string;
  content: string;
  isFeatured: boolean;
}): Promise<void> {
  if (!hasSupabaseAdminEnv()) {
    console.warn("[QUESTION_HUB]: Supabase admin env eksik — cevap yazilamadi.");
    return;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("HubAnswer").insert({
    id: crypto.randomUUID(),
    question_id: input.questionId,
    campaign_id: input.campaignId,
    username: input.username,
    content: input.content,
    upvotes: 0,
    is_featured: input.isFeatured,
    createdAt: new Date().toISOString(),
  });

  if (error) {
    console.error("[QUESTION_HUB]: Supabase cevap kaydi hatasi:", error);
  }
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

async function resolveQuestionHubId(
  slug: string,
  question: string,
  coreQuestionId: string,
): Promise<string | null> {
  const prismaHubId = await upsertQuestionHubViaPrisma(
    slug,
    question,
    coreQuestionId,
  );

  if (prismaHubId) {
    return prismaHubId;
  }

  return upsertQuestionHubViaSupabase(slug, question, coreQuestionId);
}

async function persistHubAnswer(input: {
  questionId: string;
  campaignId: string;
  username: string;
  content: string;
  isFeatured: boolean;
}): Promise<void> {
  const prismaOk = await createHubAnswerViaPrisma(input);
  if (prismaOk) {
    return;
  }

  await createHubAnswerViaSupabase(input);
}

export async function appendCampaignAnswersToQuestionHub(input: {
  campaignId: string;
  brandName: string;
  entries: QuestionHubEntry[];
  isFeatured?: boolean;
}): Promise<void> {
  if (input.entries.length === 0) {
    return;
  }

  if (!hasDatabaseUrl() && !hasSupabaseAdminEnv()) {
    console.warn(
      "[QUESTION_HUB]: DATABASE_URL ve Supabase admin birlikte eksik — hub atlandi.",
    );
    return;
  }

  const isFeatured = input.isFeatured ?? true;

  for (const entry of input.entries) {
    const slug = buildQuestionHubSlug(entry.question);
    if (!slug) {
      continue;
    }

    const content = await resolveForumAnswerContent({
      question: entry.question,
      brandName: input.brandName,
      city: entry.city,
      sectorLabel: entry.sectorLabel,
      sectorSlug: entry.sectorSlug,
      simulatedAnswer: entry.simulatedAnswer,
    });
    const username = generateForumUsername(
      `${input.campaignId}-${entry.coreQuestionId}`,
    );

    try {
      const questionHubId = await resolveQuestionHubId(
        slug,
        entry.question,
        entry.coreQuestionId,
      );

      if (!questionHubId) {
        continue;
      }

      await persistHubAnswer({
        questionId: questionHubId,
        campaignId: input.campaignId,
        username,
        content,
        isFeatured,
      });
    } catch (error) {
      console.error(
        `[QUESTION_HUB]: Hub kaydi atlandi (campaign=${input.campaignId}, slug=${slug}):`,
        error,
      );
    }
  }
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

  if (prismaAttempt.status === "not_found" || prismaAttempt.status === "failed") {
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
    return prismaAttempt.data;
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
