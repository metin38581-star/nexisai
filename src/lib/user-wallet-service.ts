import "server-only";

import { prisma } from "@/lib/db";
import { listPaymentsByUserId, recordPayment } from "@/lib/payment-store";

export const WELCOME_BALANCE_TL = 100;
const WELCOME_PROVIDER_CODE = "WELCOME_BALANCE";
const TOPUP_PROVIDER_CODES = new Set(["WALLET_TOPUP", "IYZICO_CHECKOUT"]);

export interface UserWalletRecord {
  id: string;
  balance: number;
  updatedAt: Date;
  welcomeGranted: boolean;
  hasPaidTopUp: boolean;
}

async function resolveWelcomeGranted(userId: string): Promise<boolean> {
  const payments = await listPaymentsByUserId(userId);
  return payments.some(
    (payment) => payment.providerStatusCode === WELCOME_PROVIDER_CODE,
  );
}

async function resolveHasPaidTopUp(userId: string): Promise<boolean> {
  const payments = await listPaymentsByUserId(userId);
  return payments.some(
    (payment) =>
      payment.status === "success" &&
      (TOPUP_PROVIDER_CODES.has(payment.providerStatusCode ?? "") ||
        payment.provider === "iyzico"),
  );
}

async function enrichWallet(
  wallet: { id: string; balance: number; updatedAt: Date },
  userId: string,
): Promise<UserWalletRecord> {
  try {
    const [welcomeGranted, hasPaidTopUp] = await Promise.all([
      resolveWelcomeGranted(userId),
      resolveHasPaidTopUp(userId),
    ]);

    return {
      id: wallet.id,
      balance: wallet.balance,
      updatedAt: wallet.updatedAt,
      welcomeGranted,
      hasPaidTopUp,
    };
  } catch (error) {
    console.error("[USER_WALLET]: Ödeme bayrakları okunamadı:", error);
    return {
      id: wallet.id,
      balance: wallet.balance,
      updatedAt: wallet.updatedAt,
      welcomeGranted: false,
      hasPaidTopUp: false,
    };
  }
}

export async function getOrCreateUserWallet(
  userId: string,
): Promise<UserWalletRecord> {
  const existing = await prisma.wallet.findUnique({
    where: { id: userId },
  });

  if (existing) {
    return enrichWallet(existing, userId);
  }

  const created = await prisma.wallet.create({
    data: {
      id: userId,
      balance: 0,
    },
  });

  return enrichWallet(created, userId);
}

export async function grantWelcomeBalance(userId: string): Promise<number> {
  const wallet = await getOrCreateUserWallet(userId);

  if (wallet.welcomeGranted) {
    return wallet.balance;
  }

  const updated = await prisma.wallet.update({
    where: { id: userId },
    data: {
      balance: { increment: WELCOME_BALANCE_TL },
    },
  });

  await recordPayment({
    userId,
    amount: WELCOME_BALANCE_TL,
    currency: "TRY",
    status: "success",
    provider: "internal",
    providerStatusCode: WELCOME_PROVIDER_CODE,
    description: "Kayıt hoş geldin bakiyesi",
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
    where: { id: userId },
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
    where: { id: userId },
    data: { balance: { increment: amount } },
  });

  if (options?.markPaidTopUp) {
    await recordPayment({
      userId,
      amount,
      currency: "TRY",
      status: "success",
      provider: "internal",
      providerStatusCode: "WALLET_TOPUP",
      description: "Cüzdan bakiye yüklemesi",
    });
  }

  return updated.balance;
}

export async function getUserWalletBalance(userId: string): Promise<number> {
  const wallet = await getOrCreateUserWallet(userId);
  return wallet.balance;
}

export async function userHasPaidTopUp(userId: string): Promise<boolean> {
  return resolveHasPaidTopUp(userId);
}
