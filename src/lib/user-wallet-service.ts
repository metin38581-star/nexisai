import "server-only";

import { prisma } from "@/lib/db";
import { WELCOME_BALANCE_TL, LEGACY_WELCOME_BALANCE_TL } from "@/lib/wallet-constants";
import { listPaymentsByUserId } from "@/lib/payment-store";

export { WELCOME_BALANCE_TL } from "@/lib/wallet-constants";

const WELCOME_PROVIDER_CODE = "WELCOME_BALANCE";
const WELCOME_RECONCILE_CODE = "WELCOME_BALANCE_RECONCILE";
const TOPUP_PROVIDER_CODES = new Set([
  "WALLET_TOPUP",
  "IYZICO_CHECKOUT",
  "CHECKOUT_SUCCESS",
]);

export interface CreditUserWalletOptions {
  markPaidTopUp?: boolean;
  paymentMeta?: {
    provider: string;
    providerStatusCode: string;
    description: string;
    currency?: string;
  };
}

export interface UserWalletRecord {
  id: string;
  balance: number;
  updatedAt: Date;
  welcomeGranted: boolean;
  hasPaidTopUp: boolean;
}

const DEBIT_PROVIDER_CODES = new Set(["WALLET_DEBIT", "WALLET_DEDUCT"]);
const SUCCESS_PAYMENT_STATUSES = new Set(["success", "succeeded", "paid"]);

function isSuccessfulPayment(status: string): boolean {
  return SUCCESS_PAYMENT_STATUSES.has(status);
}

function computeWalletBalanceFromPayments(
  payments: Awaited<ReturnType<typeof listPaymentsByUserId>>,
): number {
  return payments.reduce((total, payment) => {
    if (!isSuccessfulPayment(payment.status)) {
      return total;
    }

    const code = payment.providerStatusCode ?? "";

    if (DEBIT_PROVIDER_CODES.has(code)) {
      return total - payment.amount;
    }

    if (
      code === WELCOME_PROVIDER_CODE ||
      code === WELCOME_RECONCILE_CODE ||
      TOPUP_PROVIDER_CODES.has(code) ||
      payment.provider === "iyzico"
    ) {
      return total + payment.amount;
    }

    return total;
  }, 0);
}

async function syncWalletBalanceFromPayments(userId: string): Promise<number> {
  const payments = await listPaymentsByUserId(userId);
  const ledgerBalance = Math.max(0, computeWalletBalanceFromPayments(payments));

  const wallet = await prisma.wallet.findUnique({ where: { id: userId } });
  if (!wallet) {
    return ledgerBalance;
  }

  if (Math.abs(wallet.balance - ledgerBalance) > 0.001) {
    await prisma.wallet.update({
      where: { id: userId },
      data: { balance: ledgerBalance },
    });
  }

  return ledgerBalance;
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
  await prisma.$transaction(async (tx) => {
    const welcomePayments = await tx.payment.findMany({
      where: {
        userId,
        providerStatusCode: {
          in: [WELCOME_PROVIDER_CODE, WELCOME_RECONCILE_CODE],
        },
      },
    });

    const grantedTotal = welcomePayments.reduce(
      (total, payment) => total + payment.amount,
      0,
    );

    const wallet = await tx.wallet.findUnique({ where: { id: userId } });
    if (!wallet) {
      return;
    }

    // Hoş geldin bakiyesi eksik tanımlandıysa (ör. eski 100 TL politikası) tamamlama.
    if (grantedTotal > 0 && grantedTotal < WELCOME_BALANCE_TL) {
      const deficit = WELCOME_BALANCE_TL - grantedTotal;

      await tx.wallet.update({
        where: { id: userId },
        data: { balance: { increment: deficit } },
      });

      await tx.payment.create({
        data: {
          userId,
          amount: deficit,
          currency: "TRY",
          status: "success",
          provider: "internal",
          providerStatusCode: WELCOME_RECONCILE_CODE,
          description: `Hoş geldin bakiyesi ${WELCOME_BALANCE_TL} TL politikasına yükseltildi`,
        },
      });
      return;
    }

    if (grantedTotal > 0 || wallet.balance >= WELCOME_BALANCE_TL) {
      return;
    }

    const hasPaidTopUp = await resolveHasPaidTopUp(userId);
    if (hasPaidTopUp || wallet.balance !== LEGACY_WELCOME_BALANCE_TL) {
      return;
    }

    const deficit = WELCOME_BALANCE_TL - wallet.balance;

    await tx.wallet.update({
      where: { id: userId },
      data: { balance: { increment: deficit } },
    });

    await tx.payment.create({
      data: {
        userId,
        amount: deficit,
        currency: "TRY",
        status: "success",
        provider: "internal",
        providerStatusCode: WELCOME_PROVIDER_CODE,
        description: "Kayıt hoş geldin bakiyesi (legacy yükseltme)",
      },
    });
  });
}

async function enrichWallet(
  wallet: { id: string; balance: number; updatedAt: Date },
  userId: string,
): Promise<UserWalletRecord> {
  try {
    await reconcileLegacyWelcomeBalance(userId);
    const syncedBalance = await syncWalletBalanceFromPayments(userId);

    const refreshed =
      (await prisma.wallet.findUnique({ where: { id: userId } })) ?? wallet;

    const [welcomeGranted, hasPaidTopUp] = await Promise.all([
      resolveWelcomeGranted(userId),
      resolveHasPaidTopUp(userId),
    ]);

    return {
      id: refreshed.id,
      balance: syncedBalance,
      updatedAt: refreshed.updatedAt,
      welcomeGranted,
      hasPaidTopUp,
    };
  } catch (error) {
    console.error("[USER_WALLET]: Ödeme bayrakları okunamadı:", error);
    throw error;
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

  return prisma.$transaction(async (tx) => {
    const welcomePayments = await tx.payment.findMany({
      where: {
        userId,
        providerStatusCode: {
          in: [WELCOME_PROVIDER_CODE, WELCOME_RECONCILE_CODE],
        },
      },
    });

    if (welcomePayments.length > 0) {
      const wallet = await tx.wallet.findUnique({ where: { id: userId } });
      return wallet?.balance ?? 0;
    }

    const wallet = await tx.wallet.upsert({
      where: { id: userId },
      create: {
        id: userId,
        balance: WELCOME_BALANCE_TL,
      },
      update: {
        balance: WELCOME_BALANCE_TL,
      },
    });

    await tx.payment.create({
      data: {
        userId,
        amount: WELCOME_BALANCE_TL,
        currency: "TRY",
        status: "success",
        provider: "internal",
        providerStatusCode: WELCOME_PROVIDER_CODE,
        description: "Kayıt hoş geldin bakiyesi",
      },
    });

    return wallet.balance;
  });
}

export async function decrementUserWalletBalance(
  userId: string,
  amount: number,
): Promise<number> {
  await getOrCreateUserWallet(userId);

  const updated = await prisma.wallet.updateMany({
    where: { id: userId, balance: { gte: amount } },
    data: { balance: { decrement: amount } },
  });

  if (updated.count === 0) {
    throw new Error("INSUFFICIENT_BALANCE");
  }

  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { id: userId } });
  return wallet.balance;
}

export async function creditUserWallet(
  userId: string,
  amount: number,
  options?: CreditUserWalletOptions,
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    await tx.wallet.upsert({
      where: { id: userId },
      create: { id: userId, balance: amount },
      update: { balance: { increment: amount } },
    });

    if (options?.paymentMeta) {
      await tx.payment.create({
        data: {
          userId,
          amount,
          currency: options.paymentMeta.currency ?? "TRY",
          status: "success",
          provider: options.paymentMeta.provider,
          providerStatusCode: options.paymentMeta.providerStatusCode,
          description: options.paymentMeta.description,
        },
      });
    } else if (options?.markPaidTopUp) {
      await tx.payment.create({
        data: {
          userId,
          amount,
          currency: "TRY",
          status: "success",
          provider: "internal",
          providerStatusCode: "WALLET_TOPUP",
          description: "Cüzdan bakiye yüklemesi",
        },
      });
    }

    const wallet = await tx.wallet.findUniqueOrThrow({ where: { id: userId } });
    return wallet.balance;
  });
}

export async function debitWalletForCampaign(
  userId: string,
  amount: number,
  campaignId: string,
  description: string,
): Promise<{ balance: number; alreadyDebited: boolean }> {
  return prisma.$transaction(async (tx) => {
    const existingDebit = await tx.payment.findFirst({
      where: {
        campaignId,
        providerStatusCode: "WALLET_DEBIT",
        status: { in: ["success", "succeeded", "paid"] },
      },
    });

    if (existingDebit) {
      const wallet = await tx.wallet.findUnique({ where: { id: userId } });
      return { balance: wallet?.balance ?? 0, alreadyDebited: true };
    }

    const updated = await tx.wallet.updateMany({
      where: { id: userId, balance: { gte: amount } },
      data: { balance: { decrement: amount } },
    });

    if (updated.count === 0) {
      throw new Error("INSUFFICIENT_BALANCE");
    }

    await tx.payment.create({
      data: {
        userId,
        amount,
        currency: "TRY",
        status: "success",
        provider: "internal",
        providerStatusCode: "WALLET_DEBIT",
        description,
        campaignId,
      },
    });

    const wallet = await tx.wallet.findUniqueOrThrow({ where: { id: userId } });
    return { balance: wallet.balance, alreadyDebited: false };
  });
}

export async function hasCampaignWalletDebit(
  campaignId: string,
): Promise<boolean> {
  const payment = await prisma.payment.findFirst({
    where: {
      campaignId,
      providerStatusCode: "WALLET_DEBIT",
      status: { in: ["success", "succeeded", "paid"] },
    },
    select: { id: true },
  });

  return Boolean(payment);
}

export async function getUserWalletBalance(userId: string): Promise<number> {
  const wallet = await getOrCreateUserWallet(userId);
  return wallet.balance;
}

export async function userHasPaidTopUp(userId: string): Promise<boolean> {
  return resolveHasPaidTopUp(userId);
}
