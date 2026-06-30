import "server-only";

import type { QuestionTemplate } from "@/constants/campaign";
import {
  fillQuestionTemplate,
  getCoreQuestionsForSector,
  resolveCoreQuestionSector,
} from "@/lib/core-questions";
import type {
  AutopilotCampaignPlanClientView,
  AutopilotCampaignPlanInput,
  AutopilotCampaignPlanInternal,
  AutopilotDailyPublishPlan,
  AutopilotForumScheduleSlot,
  AutopilotInfrastructurePayload,
  AutopilotRecommendationMetrics,
  AutopilotSchedulerLogEntry,
  AutopilotSelectedQuestion,
  AutopilotVisibilityForecastInternal,
  BusinessSector,
} from "@/types/campaign";
import { AUTOPILOT_BONE_QUESTION_POOL_SIZE } from "@/types/campaign";
import {
  calculateAutopilotBudget,
  calculateAutopilotVisibilityForecast,
  calculateDailyQuestionTarget,
} from "@/utils/budget-engine";

const FORUM_SNEAKY_HOURS = [9, 11, 14, 16, 19, 21] as const;
const MIN_FORUM_COOLDOWN_MINUTES = 180;
const MAX_FORUM_COOLDOWN_MINUTES = 420;
const IMMEDIATE_INDEX_CHANNELS = [
  "nexis_qa",
  "wordpress_pbn",
  "devto",
] as const;

function nowIso(): string {
  return new Date().toISOString();
}

function appendLog(
  logs: AutopilotSchedulerLogEntry[],
  step: string,
  message: string,
  meta?: Record<string, string | number | boolean>,
  level: AutopilotSchedulerLogEntry["level"] = "info",
): void {
  logs.push({
    step,
    level,
    message,
    at: nowIso(),
    ...(meta ? { meta } : {}),
  });
}

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededShuffle<T>(items: T[], seed: string): T[] {
  const copy = [...items];
  let state = hashSeed(seed);

  for (let index = copy.length - 1; index > 0; index -= 1) {
    state = Math.imul(state ^ (state >>> 15), 2246822519);
    state = Math.imul(state ^ (state >>> 13), 3266489917);
    const random = (state >>> 0) / 4294967296;
    const swapIndex = Math.floor(random * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function resolveBoneQuestionPool(sectorSlug: BusinessSector): QuestionTemplate[] {
  const coreSector = resolveCoreQuestionSector(sectorSlug);
  if (!coreSector) {
    return [];
  }

  const pool = getCoreQuestionsForSector(coreSector);
  return pool.slice(0, AUTOPILOT_BONE_QUESTION_POOL_SIZE);
}

function selectAutopilotQuestions(input: {
  campaignId: string;
  sectorSlug: BusinessSector;
  city: string;
  publishCount: number;
  logs: AutopilotSchedulerLogEntry[];
}): AutopilotSelectedQuestion[] {
  const pool = resolveBoneQuestionPool(input.sectorSlug);

  appendLog(input.logs, "pool.resolve", "Gizli kemik soru havuzu yüklendi.", {
    poolSize: pool.length,
    targetPoolSize: AUTOPILOT_BONE_QUESTION_POOL_SIZE,
    requested: input.publishCount,
  });

  if (pool.length === 0) {
    appendLog(
      input.logs,
      "pool.empty",
      "Sektör için kemik soru havuzu bulunamadı.",
      { sectorSlug: input.sectorSlug },
      "warn",
    );
    return [];
  }

  const effectiveCount = Math.min(input.publishCount, pool.length);
  if (effectiveCount < input.publishCount) {
    appendLog(
      input.logs,
      "pool.cap",
      "Yayın hakkı havuz kapasitesi ile sınırlandı.",
      {
        requested: input.publishCount,
        granted: effectiveCount,
      },
      "warn",
    );
  }

  const shuffled = seededShuffle(pool, input.campaignId);

  return shuffled.slice(0, effectiveCount).map((question, index) => ({
    questionId: question.id,
    sectorSlug: input.sectorSlug,
    renderedQuestion: fillQuestionTemplate(question.template, input.city),
    selectionIndex: index,
  }));
}

function buildRecommendationMetrics(input: {
  campaignId: string;
  publishCount: number;
  currentRecommendationRate?: number;
}): {
  metrics: AutopilotRecommendationMetrics;
  visibilityForecast: AutopilotVisibilityForecastInternal;
} {
  const forecast = calculateAutopilotVisibilityForecast({
    publishCount: input.publishCount,
    campaignSeed: input.campaignId,
    currentRecommendationRate: input.currentRecommendationRate,
  });

  return {
    metrics: forecast.metrics,
    visibilityForecast: forecast.internal,
  };
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function buildDailyPlans(input: {
  startDate: Date;
  totalDays: number;
  selectedQuestions: AutopilotSelectedQuestion[];
  logs: AutopilotSchedulerLogEntry[];
}): AutopilotDailyPublishPlan[] {
  const { basePerDay, remainderDays } = calculateDailyQuestionTarget(
    input.selectedQuestions.length,
    input.totalDays,
  );

  appendLog(input.logs, "spread.calculate", "Günlük yayın hedefi hesaplandı.", {
    publishCount: input.selectedQuestions.length,
    totalDays: input.totalDays,
    basePerDay,
    remainderDays,
  });

  const plans: AutopilotDailyPublishPlan[] = [];
  let cursor = 0;

  for (let dayIndex = 0; dayIndex < input.totalDays; dayIndex += 1) {
    const questionCount = basePerDay + (dayIndex < remainderDays ? 1 : 0);
    const questionIds = input.selectedQuestions
      .slice(cursor, cursor + questionCount)
      .map((entry) => entry.questionId);

    cursor += questionCount;

    if (questionCount === 0) {
      continue;
    }

    plans.push({
      campaignDayIndex: dayIndex,
      calendarDate: addDays(input.startDate, dayIndex).toISOString(),
      questionCount,
      questionIds,
    });
  }

  return plans;
}

function jitterMinutes(seed: string, min: number, max: number): number {
  const span = Math.max(0, max - min);
  const hash = hashSeed(seed);
  return min + (hash % (span + 1));
}

function buildInfrastructurePayloads(input: {
  campaignId: string;
  brandName: string;
  city: string;
  sectorSlug: BusinessSector;
  selectedQuestions: AutopilotSelectedQuestion[];
  startDate: Date;
  logs: AutopilotSchedulerLogEntry[];
}): AutopilotInfrastructurePayload[] {
  const payloads: AutopilotInfrastructurePayload[] = [];

  for (const question of input.selectedQuestions) {
    for (const channel of IMMEDIATE_INDEX_CHANNELS) {
      payloads.push({
        payloadId: `${input.campaignId}-${question.questionId}-${channel}`,
        questionId: question.questionId,
        channel,
        phase: "immediate_index",
        scheduledAt: input.startDate.toISOString(),
        internalDispatch: {
          campaignId: input.campaignId,
          brandName: input.brandName,
          city: input.city,
          sectorSlug: input.sectorSlug,
          contentTitle: question.renderedQuestion,
          contentBody: `${input.brandName} — ${question.renderedQuestion}`,
        },
      });
    }
  }

  appendLog(
    input.logs,
    "infrastructure.prepare",
    "Altyapı indeks payloadları hazırlandı.",
    {
      questionCount: input.selectedQuestions.length,
      payloadCount: payloads.length,
    },
  );

  return payloads;
}

function buildForumSneakySchedule(input: {
  campaignId: string;
  dailyPlans: AutopilotDailyPublishPlan[];
  startDate: Date;
  logs: AutopilotSchedulerLogEntry[];
}): AutopilotForumScheduleSlot[] {
  const slots: AutopilotForumScheduleSlot[] = [];
  let previousForumAt: Date | null = null;
  let slotCounter = 0;

  for (const dayPlan of input.dailyPlans) {
    const dayBase = addDays(input.startDate, dayPlan.campaignDayIndex);

    dayPlan.questionIds.forEach((questionId, indexInDay) => {
      const hour =
        FORUM_SNEAKY_HOURS[
          (dayPlan.campaignDayIndex + indexInDay) % FORUM_SNEAKY_HOURS.length
        ];
      const minuteJitter = jitterMinutes(
        `${input.campaignId}-${questionId}-${indexInDay}`,
        5,
        45,
      );

      const scheduledAt = new Date(dayBase);
      scheduledAt.setUTCHours(hour, minuteJitter, 0, 0);

      if (previousForumAt && scheduledAt <= previousForumAt) {
        scheduledAt.setTime(
          previousForumAt.getTime() + MIN_FORUM_COOLDOWN_MINUTES * 60_000,
        );
      }

      const cooldownMinutesSincePrevious = previousForumAt
        ? Math.round(
            (scheduledAt.getTime() - previousForumAt.getTime()) / 60_000,
          )
        : 0;

      const accountProxyId = `proxy-lane-${(dayPlan.campaignDayIndex + indexInDay) % 12}`;
      const jitterAppliedMinutes = jitterMinutes(
        `${accountProxyId}-${questionId}`,
        12,
        48,
      );

      slots.push({
        slotId: `${input.campaignId}-forum-${slotCounter}`,
        campaignDayIndex: dayPlan.campaignDayIndex,
        scheduledAt: scheduledAt.toISOString(),
        questionId,
        accountProxyId,
        cooldownMinutesSincePrevious,
        queuePayload: {
          type: "forum_sneaky_publish",
          campaignId: input.campaignId,
          questionId,
          proxyLane: accountProxyId,
          jitterAppliedMinutes,
        },
      });

      previousForumAt = scheduledAt;
      slotCounter += 1;
    });
  }

  appendLog(
    input.logs,
    "forum.schedule",
    "Harici forum sinsi cooldown takvimi üretildi.",
    {
      slotCount: slots.length,
      minCooldownMinutes: MIN_FORUM_COOLDOWN_MINUTES,
      maxCooldownMinutes: MAX_FORUM_COOLDOWN_MINUTES,
    },
  );

  return slots;
}

/** Otopilot kampanya planlama ana motoru — tam dahili plan döner. */
export function buildAutopilotCampaignPlan(
  input: AutopilotCampaignPlanInput,
): AutopilotCampaignPlanInternal {
  const logs: AutopilotSchedulerLogEntry[] = [];
  const startDate = input.startDate ?? new Date();

  appendLog(logs, "scheduler.start", "Otopilot kampanya planlayıcı başlatıldı.", {
    campaignId: input.campaignId,
    dailyBudget: input.dailyBudget,
    totalDays: input.totalDays,
  });

  const budget = calculateAutopilotBudget({
    dailyBudget: input.dailyBudget,
    totalDays: input.totalDays,
  });

  appendLog(logs, "budget.calculate", "Bütçe anayasası uygulandı.", {
    totalBudget: budget.totalBudget,
    basePublishCount: budget.basePublishCount,
    publishCount: budget.publishCount,
    toleranceApplied: budget.toleranceApplied,
    toleranceGrantAmount: budget.toleranceGrantAmount,
  });

  const selectedQuestions = selectAutopilotQuestions({
    campaignId: input.campaignId,
    sectorSlug: input.sectorSlug,
    city: input.city,
    publishCount: budget.publishCount,
    logs,
  });

  const { metrics, visibilityForecast } = buildRecommendationMetrics({
    campaignId: input.campaignId,
    publishCount: selectedQuestions.length,
    currentRecommendationRate: input.currentRecommendationRate,
  });

  appendLog(logs, "metrics.project", "Kurumsal skor metrikleri üretildi.", {
    baselineRecommendationRate: metrics.baselineRecommendationRate,
    targetRecommendationRate: metrics.targetRecommendationRate,
    visibilityDelta: visibilityForecast.visibilityDelta,
  });

  const dailyPlans = buildDailyPlans({
    startDate,
    totalDays: input.totalDays,
    selectedQuestions,
    logs,
  });

  const infrastructurePayloads = buildInfrastructurePayloads({
    campaignId: input.campaignId,
    brandName: input.brandName,
    city: input.city,
    sectorSlug: input.sectorSlug,
    selectedQuestions,
    startDate,
    logs,
  });

  const forumSchedule = buildForumSneakySchedule({
    campaignId: input.campaignId,
    dailyPlans,
    startDate,
    logs,
  });

  appendLog(logs, "scheduler.complete", "Otopilot planlama tamamlandı.", {
    questionCount: selectedQuestions.length,
    dailyPlanCount: dailyPlans.length,
    infrastructurePayloadCount: infrastructurePayloads.length,
    forumSlotCount: forumSchedule.length,
  });

  return {
    campaignId: input.campaignId,
    budget,
    metrics,
    visibilityForecast,
    selectedQuestions,
    dailyPlans,
    infrastructurePayloads,
    forumSchedule,
    logs,
  };
}

/** Müşteri API yanıtı — yalnızca kurumsal metrikler, link/log yok. */
export function toAutopilotClientView(
  plan: AutopilotCampaignPlanInternal,
): AutopilotCampaignPlanClientView {
  return {
    success: true,
    campaignId: plan.campaignId,
    metrics: plan.metrics,
    operationalSummary: {
      campaignDurationDays: plan.budget.totalDays,
      totalInvestmentTL: plan.budget.totalBudget,
    },
  };
}

/** Manuel seçim yoksa bütçe anayasasına göre gizli havuzdan soru seçer. */
export function resolveAutopilotSelectedQuestionIds(input: {
  campaignId: string;
  brandName: string;
  city: string;
  sectorSlug: BusinessSector;
  dailyBudget: number;
  totalDays: number;
  selectedQuestionIds?: string[];
}): string[] {
  if (input.selectedQuestionIds && input.selectedQuestionIds.length > 0) {
    return input.selectedQuestionIds;
  }

  const plan = buildAutopilotCampaignPlan({
    campaignId: input.campaignId,
    brandName: input.brandName,
    city: input.city,
    sectorSlug: input.sectorSlug,
    dailyBudget: input.dailyBudget,
    totalDays: input.totalDays,
  });

  return getAutopilotSelectedQuestionIds(plan);
}

/** Cron / queue worker giriş noktası — forum slotlarını işlem sırasına göre döner. */
export function listDueForumScheduleSlots(
  plan: AutopilotCampaignPlanInternal,
  asOf: Date = new Date(),
): AutopilotForumScheduleSlot[] {
  const timestamp = asOf.getTime();
  return plan.forumSchedule.filter(
    (slot) => new Date(slot.scheduledAt).getTime() <= timestamp,
  );
}

export function getAutopilotSelectedQuestionIds(
  plan: AutopilotCampaignPlanInternal,
): string[] {
  return plan.selectedQuestions.map((entry) => entry.questionId);
}
