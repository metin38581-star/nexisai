import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export interface IyzicoConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
}

export function getIyzicoConfig(): IyzicoConfig | null {
  const apiKey = process.env.IYZICO_API_KEY?.trim();
  const secretKey = process.env.IYZICO_SECRET_KEY?.trim();
  const baseUrl =
    process.env.IYZICO_BASE_URL?.trim() ?? "https://sandbox-api.iyzipay.com";

  if (!apiKey || !secretKey) {
    return null;
  }

  return { apiKey, secretKey, baseUrl };
}

export function isIyzicoConfigured(): boolean {
  return getIyzicoConfig() !== null;
}

export interface InitializeCheckoutInput {
  userId: string;
  amount: number;
  buyerEmail: string;
  buyerName: string;
  campaignDraft?: Record<string, unknown>;
  callbackUrl: string;
}

export interface InitializeCheckoutResult {
  checkoutId: string;
  token: string;
  paymentPageUrl: string;
}

function resolveSiteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export function buildPaymentCallbackUrl(): string {
  return `${resolveSiteOrigin()}/api/payments/callback`;
}

export async function initializeIyzicoCheckout(
  input: InitializeCheckoutInput,
): Promise<InitializeCheckoutResult> {
  const config = getIyzicoConfig();

  if (!config) {
    throw new Error("IYZICO_NOT_CONFIGURED");
  }

  const conversationId = `nexis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const checkout = await prisma.iyzicoCheckout.create({
    data: {
      userId: input.userId,
      amount: input.amount,
      currency: "TRY",
      status: "pending",
      conversationId,
      campaignDraft: (input.campaignDraft ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Iyzipay = require("iyzipay") as new (cfg: {
    apiKey: string;
    secretKey: string;
    uri: string;
  }) => {
    checkoutFormInitialize: {
      create: (
        req: Record<string, unknown>,
        cb: (err: Error | null, result: Record<string, unknown>) => void,
      ) => void;
    };
  };

  const iyzipay = new Iyzipay({
    apiKey: config.apiKey,
    secretKey: config.secretKey,
    uri: config.baseUrl,
  });

  const request = {
    locale: "tr",
    conversationId,
    price: input.amount.toFixed(2),
    paidPrice: input.amount.toFixed(2),
    currency: "TRY",
    basketId: checkout.id,
    paymentGroup: "PRODUCT",
    callbackUrl: input.callbackUrl,
    enabledInstallments: [1],
    buyer: {
      id: input.userId.slice(0, 20),
      name: input.buyerName.split(" ")[0] ?? "Nexis",
      surname: input.buyerName.split(" ").slice(1).join(" ") || "User",
      gsmNumber: "+905555555555",
      email: input.buyerEmail,
      identityNumber: "11111111111",
      registrationAddress: "Turkey",
      ip: "85.34.78.112",
      city: "Istanbul",
      country: "Turkey",
    },
    shippingAddress: {
      contactName: input.buyerName,
      city: "Istanbul",
      country: "Turkey",
      address: "Turkey",
    },
    billingAddress: {
      contactName: input.buyerName,
      city: "Istanbul",
      country: "Turkey",
      address: "Turkey",
    },
    basketItems: [
      {
        id: checkout.id,
        name: "NexisAI Kampanya Bakiyesi",
        category1: "Digital",
        itemType: "VIRTUAL",
        price: input.amount.toFixed(2),
      },
    ],
  };

  const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
    iyzipay.checkoutFormInitialize.create(request, (err, res) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(res);
    });
  });

  if (result.status !== "success" || typeof result.token !== "string") {
    await prisma.iyzicoCheckout.update({
      where: { id: checkout.id },
      data: { status: "failed" },
    });
    throw new Error(
      typeof result.errorMessage === "string"
        ? result.errorMessage
        : "IYZICO_INIT_FAILED",
    );
  }

  await prisma.iyzicoCheckout.update({
    where: { id: checkout.id },
    data: { token: result.token },
  });

  return {
    checkoutId: checkout.id,
    token: result.token,
    paymentPageUrl:
      typeof result.paymentPageUrl === "string"
        ? result.paymentPageUrl
        : `${resolveSiteOrigin()}/api/payments/redirect?token=${result.token}`,
  };
}

export async function completeIyzicoCheckout(
  token: string,
): Promise<{
  checkoutId: string;
  userId: string;
  amount: number;
  alreadyCredited: boolean;
} | null> {
  const config = getIyzicoConfig();
  if (!config) {
    return null;
  }

  const checkout = await prisma.iyzicoCheckout.findFirst({
    where: { token },
  });

  if (!checkout) {
    return null;
  }

  if (checkout.status === "success") {
    return {
      checkoutId: checkout.id,
      userId: checkout.userId,
      amount: checkout.amount,
      alreadyCredited: true,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Iyzipay = require("iyzipay") as new (cfg: {
    apiKey: string;
    secretKey: string;
    uri: string;
  }) => {
    checkoutForm: {
      retrieve: (
        req: Record<string, unknown>,
        cb: (err: Error | null, result: Record<string, unknown>) => void,
      ) => void;
    };
  };

  const iyzipay = new Iyzipay({
    apiKey: config.apiKey,
    secretKey: config.secretKey,
    uri: config.baseUrl,
  });

  const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
    iyzipay.checkoutForm.retrieve({ locale: "tr", token }, (err, res) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(res);
    });
  });

  if (result.paymentStatus !== "SUCCESS") {
    await prisma.iyzicoCheckout.update({
      where: { id: checkout.id },
      data: { status: "failed" },
    });
    return null;
  }

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.iyzicoCheckout.updateMany({
      where: { id: checkout.id, status: "pending" },
      data: { status: "success" },
    });

    if (claimed.count === 0) {
      const current = await tx.iyzicoCheckout.findUnique({
        where: { id: checkout.id },
      });

      if (current?.status !== "success") {
        return null;
      }

      const credited = await tx.payment.findFirst({
        where: {
          userId: checkout.userId,
          providerStatusCode: "CHECKOUT_SUCCESS",
          description: { contains: checkout.id },
        },
      });

      return {
        checkoutId: checkout.id,
        userId: checkout.userId,
        amount: checkout.amount,
        alreadyCredited: Boolean(credited),
      };
    }

    await tx.wallet.upsert({
      where: { id: checkout.userId },
      create: { id: checkout.userId, balance: checkout.amount },
      update: { balance: { increment: checkout.amount } },
    });

    await tx.payment.create({
      data: {
        userId: checkout.userId,
        amount: checkout.amount,
        currency: "TRY",
        status: "success",
        provider: "iyzico",
        providerStatusCode: "CHECKOUT_SUCCESS",
        description: `iyzico cüzdan yüklemesi (checkout:${checkout.id})`,
      },
    });

    return {
      checkoutId: checkout.id,
      userId: checkout.userId,
      amount: checkout.amount,
      alreadyCredited: false,
    };
  });
}

export async function getCheckoutById(checkoutId: string) {
  return prisma.iyzicoCheckout.findUnique({ where: { id: checkoutId } });
}
