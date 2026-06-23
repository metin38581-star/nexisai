import "server-only";

import { prisma } from "@/lib/db";
import { normalizeBusinessName } from "@/lib/business-normalize";

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

export async function isTrialBlockedForBusiness(
  businessName: string,
  userId: string,
): Promise<boolean> {
  const existing = await findRegisteredBusiness(businessName);

  if (!existing?.isTrialUsed) {
    return false;
  }

  const wallet = await prisma.userWallet.findUnique({
    where: { userId },
  });

  if (wallet?.hasPaidTopUp) {
    return false;
  }

  return true;
}
