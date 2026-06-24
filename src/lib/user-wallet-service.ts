import "server-only";

import { prisma } from "@/lib/db";
import { WELCOME_BALANCE_TL, LEGACY_WELCOME_BALANCE_TL } from "@/lib/wallet-constants";
import { listPaymentsByUserId, recordPayment } from "@/lib/payment-store";

export { WELCOME_BALANCE_TL } from "@/lib/wallet-constants";

const WELCOME_PROVIDER_CODE = "WELCOME_BALANCE";
const WELCOME_RECONCILE_CODE = "WELCOME_BALANCE_RECONCILE";
const TOPUP_PROVIDER_CODES = new Set(["WALLET_TOPUP", "IYZICO_CHECKOUT"]);

export interface UserWalletRecord {
  id: string;
  balance: number;
  updatedAt: Date;
  welcomeGranted: boolean;
  hasPaidTopUp: boolean;
}

function sumWelcomePayments(
  payments: Awaited<ReturnType<typeof listPaymentsByUserId>>,
): number {
  return payments
    .filter(
      (payment) =>
        payment.providerStatusCode === WELCOME_PROVIDER_CODE ||
        payment.providerStatusCode === WELCOME_RECONCILE_CODE,
    )
    .reduce((total, payment) => total + payment.amount, 0);
}

async function resolveWelcomeGranted(userId: string): Promise<boolean> {
  const payments = await listPaymentsByUserId(userId);
  return sumWelcomePayments(payments) > 0;
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

/** Eski hoş geldin kayıtlarını güncel 300 TL politikasına yükseltir. */
async function reconcileLegacyWelcomeBalance(userId: string): Promise<void> {
  const payments = await listPaymentsByUserId(userId);
  const grantedTotal = sumWelcomePayments(payments);
  const wallet = await prisma.wallet.findUnique({ where: { id: userId } });

  if (!wallet) {
    return;
  }

  if (grantedTotal > 0 && wallet.balance < grantedTotal) {
    await prisma.wallet.update({
      where: { id: userId },
      data: { balance: { increment: grantedTotal - wallet.balance } },
    });
  }

  if (grantedTotal > 0 && grantedTotal < WELCOME_BALANCE_TL) {
    const deficit = WELCOME_BALANCE_TL - grantedTotal;

    await prisma.wallet.update({
      where: { id: userId },
      data: { balance: { increment: deficit } },
    });

    await recordPayment({
      userId,
      amount: deficit,
      currency: "TRY",
      status: "success",
      provider: "internal",
      providerStatusCode: WELCOME_RECONCILE_CODE,
      description: `Hoş geldin bakiyesi ${WELCOME_BALANCE_TL} TL politikasına yükseltildi`,
    });
    return;
  }

  const refreshed =
    (await prisma.wallet.findUnique({ where: { id: userId } })) ?? wallet;

  if (grantedTotal > 0 || refreshed.balance >= WELCOME_BALANCE_TL) {
    return;
  }

  const hasPaidTopUp = await resolveHasPaidTopUp(userId);
  if (hasPaidTopUp || wallet.balance !== LEGACY_WELCOME_BALANCE_TL) {
    return;
  }

  const deficit = WELCOME_BALANCE_TL - wallet.balance;

  await prisma.wallet.update({
    where: { id: userId },
    data: { balance: { increment: deficit } },
  });

  await recordPayment({
    userId,
    amount: WELCOME_BALANCE_TL,
    currency: "TRY",
    status: "success",
    provider: "internal",
    providerStatusCode: WELCOME_PROVIDER_CODE,
    description: "Kayıt hoş geldin bakiyesi (legacy yükseltme)",
  });
}

async function enrichWallet(
  wallet: { id: string; balance: number; updatedAt: Date },
  userId: string,
): Promise<UserWalletRecord> {
  try {
    await reconcileLegacyWelcomeBalance(userId);

    const refreshed =
      (await prisma.wallet.findUnique({ where: { id: userId } })) ?? wallet;

    const [welcomeGranted, hasPaidTopUp] = await Promise.all([
      resolveWelcomeGranted(userId),
      resolveHasPaidTopUp(userId),
    ]);

    return {
      id: refreshed.id,
      balance: refreshed.balance,
      updatedAt: refreshed.updatedAt,
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

/**
 * Yeni kayıt: Wallet satırını auth user id ile oluşturur ve 300 TL hoş geldin bakiyesi tanımlar.
 */
export async function grantWelcomeBalance(userId: string): Promise<number> {
  if (!userId.trim()) {
    throw new Error("Geçersiz kullanıcı kimliği.");
  }

  if (await resolveWelcomeGranted(userId)) {
    await reconcileLegacyWelcomeBalance(userId);
    const wallet = await prisma.wallet.findUnique({ where: { id: userId } });
    return wallet?.balance ?? 0;
  }

  const wallet = await prisma.wallet.upsert({
    where: { id: userId },
    create: {
      id: userId,
      balance: WELCOME_BALANCE_TL,
    },
    update: {
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

  return wallet.balance;
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
