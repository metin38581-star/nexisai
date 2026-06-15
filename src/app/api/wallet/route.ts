import { NextResponse } from "next/server";

import { handleApiRouteError, assertDataAccessEnv } from "@/lib/api-error";
import { logServerEnvStatus } from "@/lib/server-env";
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

      return NextResponse.json({
        success: true,
        balance,
      });
    }

    const balance = await incrementWalletBalance(wallet.id, amount);

    console.log(`[CÜZDAN_YÜKLEME]: +$${amount} — yeni bakiye $${balance}`);

    return NextResponse.json({
      success: true,
      balance,
    });
  } catch (error) {
    return handleApiRouteError(error, "Bakiye yüklenirken bir hata oluştu.");
  }
}
