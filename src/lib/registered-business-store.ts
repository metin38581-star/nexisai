import "server-only";

import { prisma } from "@/lib/db";
import { normalizeBusinessName } from "@/lib/business-normalize";
import { userHasCampaignPayment } from "@/lib/campaign-payment-service";

export class TrialBusinessBlockedError extends Error {
  constructor() {
    super("TRIAL_BUSINESS_BLOCKED");
    this.name = "TrialBusinessBlockedError";
  }
}

export async function findRegisteredBusiness(businessName: string) {
  const normalizedName = normalizeBusinessName(businessName);

  return prisma.registeredBusiness.findUnique({
    where: { normalizedName },
  });
}

export async function registerBusinessForTrial(
  businessName: string,
  userId: string,
): Promise<void> {
  const normalizedName = normalizeBusinessName(businessName);

  await prisma.registeredBusiness.upsert({
    where: { normalizedName },
    create: {
      businessName: businessName.trim(),
      normalizedName,
      createdByUserId: userId,
      isTrialUsed: true,
    },
    update: {
      isTrialUsed: true,
    },
  });
}

/**
 * Deneme hakkını kampanya başlamadan atomik olarak talep eder.
 * Ödeme yapmamış kullanıcılar işletme başına yalnızca bir kez deneyebilir.
 */
export async function assertTrialCampaignAllowed(
  businessName: string,
  userId: string,
): Promise<void> {
  const paidCampaign = await userHasCampaignPayment(userId);
  if (paidCampaign) {
    return;
  }

  const normalizedName = normalizeBusinessName(businessName);
  const existing = await prisma.registeredBusiness.findUnique({
    where: { normalizedName },
  });

  if (existing?.isTrialUsed) {
    throw new TrialBusinessBlockedError();
  }

  try {
    await prisma.registeredBusiness.create({
      data: {
        businessName: businessName.trim(),
        normalizedName,
        createdByUserId: userId,
        isTrialUsed: true,
      },
    });
  } catch (error) {
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2002") {
      throw new TrialBusinessBlockedError();
    }
    throw error;
  }
}

export async function isTrialBlockedForBusiness(
  businessName: string,
  userId: string,
): Promise<boolean> {
  const existing = await findRegisteredBusiness(businessName);

  if (!existing?.isTrialUsed) {
    return false;
  }

  const paidCampaign = await userHasCampaignPayment(userId);

  if (paidCampaign) {
    return false;
  }

  return true;
}
