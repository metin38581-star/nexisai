import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { sendGrowthLoopEmail } from "@/lib/email-service";

const EMAIL_DELAY_MIN_MS = 15 * 60 * 1000;
const EMAIL_DELAY_MAX_MS = 20 * 60 * 1000;

export interface GrowthQuestionScore {
  question: string;
  initialScore: number;
  currentScore: number;
}

function randomInitialScore(): number {
  return Math.random() < 0.5 ? 0 : Math.floor(Math.random() * 2) + 1;
}

function randomUpdatedScore(): number {
  return 18 + Math.floor(Math.random() * 8);
}

function parseQuestionScores(value: unknown): GrowthQuestionScore[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is GrowthQuestionScore =>
      typeof entry === "object" &&
      entry !== null &&
      "question" in entry &&
      "initialScore" in entry &&
      "currentScore" in entry,
  );
}

export function buildInitialQuestionScores(
  questions: string[],
): GrowthQuestionScore[] {
  return questions.map((question) => {
    const initialScore = randomInitialScore();
    return {
      question,
      initialScore,
      currentScore: initialScore,
    };
  });
}

export async function createCampaignGrowthLoop(
  campaignId: string,
  userId: string,
  questions: string[],
): Promise<void> {
  const delay =
    EMAIL_DELAY_MIN_MS +
    Math.floor(Math.random() * (EMAIL_DELAY_MAX_MS - EMAIL_DELAY_MIN_MS));

  const questionScores = buildInitialQuestionScores(questions);

  await prisma.campaignGrowthLoop.create({
    data: {
      campaignId,
      userId,
      emailScheduledAt: new Date(Date.now() + delay),
      questionScores: questionScores as unknown as Prisma.InputJsonValue,
    },
  });
}

/** Growth loop yoksa oluşturur; mevcut kaydı korur. */
export async function ensureCampaignGrowthLoop(
  campaignId: string,
  userId: string,
  questions: string[],
): Promise<void> {
  const normalizedQuestions = questions
    .map((question) => question.trim())
    .filter(Boolean);

  if (normalizedQuestions.length === 0) {
    return;
  }

  const existing = await prisma.campaignGrowthLoop.findUnique({
    where: { campaignId },
    select: { id: true },
  });

  if (existing) {
    return;
  }

  await createCampaignGrowthLoop(campaignId, userId, normalizedQuestions);
}

export async function getCampaignGrowthLoop(campaignId: string) {
  let loop = await prisma.campaignGrowthLoop.findUnique({
    where: { campaignId },
  });

  if (!loop) {
    return null;
  }

  const now = Date.now();
  const isDue = now >= loop.emailScheduledAt.getTime();

  if (isDue && !loop.scoresUpdatedAt) {
    const updatedScores = parseQuestionScores(loop.questionScores).map(
      (entry) => ({
        ...entry,
        currentScore: randomUpdatedScore(),
      }),
    );

    loop = await prisma.campaignGrowthLoop.update({
      where: { id: loop.id },
      data: {
        questionScores: updatedScores as unknown as Prisma.InputJsonValue,
        scoresUpdatedAt: new Date(),
      },
    });
  }

  const scoresUpdated = loop.scoresUpdatedAt !== null;
  const questionScores = parseQuestionScores(loop.questionScores);

  return {
    campaignId: loop.campaignId,
    emailSent: loop.emailSentAt !== null,
    scoresUpdated,
    questionScores: questionScores.map((entry) => ({
      question: entry.question,
      initialScore: entry.initialScore,
      currentScore: entry.currentScore,
    })),
  };
}

export async function processDueGrowthLoops(): Promise<number> {
  const dueLoops = await prisma.campaignGrowthLoop.findMany({
    where: {
      emailScheduledAt: { lte: new Date() },
      emailSentAt: null,
    },
    take: 50,
  });

  let processed = 0;

  for (const loop of dueLoops) {
    const scores = parseQuestionScores(loop.questionScores).map(
      (entry) => ({
        ...entry,
        currentScore: randomUpdatedScore(),
      }),
    );

    await prisma.campaignGrowthLoop.update({
      where: { id: loop.id },
      data: {
        questionScores: scores as unknown as Prisma.InputJsonValue,
        scoresUpdatedAt: new Date(),
        emailSentAt: new Date(),
      },
    });

    await sendGrowthLoopEmail(loop.userId, "Kullanıcı");
    processed += 1;
  }

  return processed;
}
