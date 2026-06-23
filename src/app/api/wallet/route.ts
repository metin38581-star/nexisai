import { NextResponse } from "next/server";

import { handleApiRouteError, assertDataAccessEnv } from "@/lib/api-error";
import { getActiveUserId } from "@/lib/auth-session";
import { logServerEnvStatus } from "@/lib/server-env";
import { recordPayment } from "@/lib/payment-store";
import {
  creditUserWallet,
  decrementUserWalletBalance,
  getOrCreateUserWallet,
} from "@/lib/user-wallet-service";
import {
  buildPaymentCallbackUrl,
  initializeIyzicoCheckout,
  isIyzicoConfigured,
} from "@/lib/iyzico-client";

export async function GET(request: Request) {
  try {
    logServerEnvStatus("wallet-get");
    assertDataAccessEnv();

    const activeUserId = await getActiveUserId(request);
    if (!activeUserId) {
      return NextResponse.json({
        success: true,
        balance: 0,
        isGuest: true,
      });
    }

    const wallet = await getOrCreateUserWallet(activeUserId);

    return NextResponse.json({
      success: true,
      id: wallet.id,
      balance: wallet.balance,
      welcomeGranted: wallet.welcomeGranted,
      hasPaidTopUp: wallet.hasPaidTopUp,
    });
  } catch (error) {
    return handleApiRouteError(error, "Cüzdan bakiyesi alınamadı.");
  }
}

export async function POST(request: Request) {
  try {
    assertDataAccessEnv();
    const activeUserId = await getActiveUserId(request);
    if (!activeUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Bakiye işlemi için oturum açmanız gerekiyor.",
        },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      amount?: number;
      operation?: "topup" | "deduct";
      useIyzico?: boolean;
    };
    const amount = Number(body.amount);
    const operation = body.operation ?? "topup";
    const useIyzico = body.useIyzico ?? true;

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Geçerli bir miktar girin." },
        { status: 400 },
      );
    }

    if (operation === "deduct") {
      const wallet = await getOrCreateUserWallet(activeUserId);

      if (wallet.balance < amount) {
        return NextResponse.json(
          { success: false, error: "Yetersiz cüzdan bakiyesi." },
          { status: 400 },
        );
      }

      const balance = await decrementUserWalletBalance(activeUserId, amount);

      await recordPayment({
        userId: activeUserId,
        amount,
        currency: "TRY",
        status: "success",
        provider: "internal",
        providerStatusCode: "WALLET_DEDUCT",
        description: "Manuel cüzdan kesintisi",
      });

      return NextResponse.json({
        success: true,
        balance,
      });
    }

    if (useIyzico && isIyzicoConfigured()) {
      const checkout = await initializeIyzicoCheckout({
        userId: activeUserId,
        amount,
        buyerEmail: "user@nexisai.com",
        buyerName: "NexisAI Kullanıcı",
        callbackUrl: buildPaymentCallbackUrl(),
      });

      return NextResponse.json({
        success: true,
        requiresPayment: true,
        paymentPageUrl: checkout.paymentPageUrl,
        checkoutId: checkout.checkoutId,
      });
    }

    const balance = await creditUserWallet(activeUserId, amount, {
      markPaidTopUp: true,
    });

    await recordPayment({
      userId: activeUserId,
      amount,
      currency: "TRY",
      status: "success",
      provider: "internal",
      providerStatusCode: "WALLET_TOPUP",
      description: "Cüzdan bakiye yüklemesi",
    });

    return NextResponse.json({
      success: true,
      balance,
    });
  } catch (error) {
    return handleApiRouteError(error, "Bakiye yüklenirken bir hata oluştu.");
  }
}
