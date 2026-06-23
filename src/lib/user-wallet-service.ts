import "server-only";

import { prisma } from "@/lib/db";

export const WELCOME_BALANCE_TL = 100;

export async function getOrCreateUserWallet(userId: string) {
  const existing = await prisma.wallet.findUnique({
    where: { userId },
  });

  if (existing) {
    return existing;
  }

  return prisma.wallet.create({
    data: {
      userId,
      balance: 0,
      welcomeGranted: false,
      hasPaidTopUp: false,
    },
  });
}

export async function grantWelcomeBalance(userId: string): Promise<number> {
  const wallet = await getOrCreateUserWallet(userId);

  if (wallet.welcomeGranted) {
    return wallet.balance;
  }

  const updated = await prisma.wallet.update({
    where: { userId },
    data: {
      balance: { increment: WELCOME_BALANCE_TL },
      welcomeGranted: true,
    },
  });

  return updated.balance;
}

export async function decrementUserWalletBalance(
  userId: string,
  amount: number,
): Promise<number> {
  const wallet = await getOrCreateUserWallet(userId);

  if (wallet.balance < amount) {
    throw new Error("INSUFFICIENT_BALANCE");
  }

  const updated = await prisma.wallet.update({
    where: { userId },
    data: { balance: { decrement: amount } },
  });

  return updated.balance;
}

export async function creditUserWallet(
  userId: string,
  amount: number,
  options?: { markPaidTopUp?: boolean },
): Promise<number> {
  await getOrCreateUserWallet(userId);

  const updated = await prisma.wallet.update({
    where: { userId },
    data: {
      balance: { increment: amount },
      ...(options?.markPaidTopUp ? { hasPaidTopUp: true } : {}),
    },
  });

  return updated.balance;
}

export async function getUserWalletBalance(userId: string): Promise<number> {
  const wallet = await getOrCreateUserWallet(userId);
  return wallet.balance;
}
