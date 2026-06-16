import { NextResponse } from "next/server";

import { handleApiRouteError, assertDataAccessEnv } from "@/lib/api-error";
import { getActiveUserId } from "@/lib/auth-session";
import { logServerEnvStatus } from "@/lib/server-env";
import { recordPayment } from "@/lib/payment-store";
import {
  decrementWalletBalance,
  getOrCreateWallet,
  incrementWalletBalance,
} from "@/lib/wallet-service";

export async function GET() {
  try {
    logServerEnvStatus("wallet-get");
    assertDataAccessEnv();
    const wallet = await getOrCreateWallet();

    return NextResponse.json({
      success: true,
      id: wallet.id,
      balance: wallet.balance,
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
    };
    const amount = Number(body.amount);
    const operation = body.operation ?? "topup";

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Geçerli bir miktar girin." },
        { status: 400 },
      );
    }

    const wallet = await getOrCreateWallet();

    if (operation === "deduct") {
      if (wallet.balance < amount) {
        return NextResponse.json(
          { success: false, error: "Yetersiz cüzdan bakiyesi." },
          { status: 400 },
        );
      }

      const balance = await decrementWalletBalance(wallet.id, amount);

      await recordPayment({
        userId: activeUserId,
        amount,
        currency: "USD",
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

    const balance = await incrementWalletBalance(wallet.id, amount);

    await recordPayment({
      userId: activeUserId,
      amount,
      currency: "USD",
      status: "success",
      provider: "internal",
      providerStatusCode: "WALLET_TOPUP",
      description: "Cüzdan bakiye yüklemesi",
    });

    console.log(`[CÜZDAN_YÜKLEME]: +$${amount} — yeni bakiye $${balance}`);

    return NextResponse.json({
      success: true,
      balance,
    });
  } catch (error) {
    return handleApiRouteError(error, "Bakiye yüklenirken bir hata oluştu.");
  }
}
