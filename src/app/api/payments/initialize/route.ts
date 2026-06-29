import { NextResponse } from "next/server";

import { handleApiRouteError } from "@/lib/api-error";
import { getActiveUserId } from "@/lib/auth-session";
import {
  buildPaymentCallbackUrl,
  initializeIyzicoCheckout,
  isIyzicoConfigured,
} from "@/lib/iyzico-client";

interface PaymentInitializeRequest {
  amount?: number;
  campaignId?: string;
  campaignDraft?: Record<string, unknown>;
  buyerEmail?: string;
  buyerName?: string;
}

export async function POST(request: Request) {
  try {
    const userId = await getActiveUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Ödeme için oturum açmanız gerekiyor." },
        { status: 401 },
      );
    }

    if (!isIyzicoConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Ödeme sistemi yapılandırılmamış. Lütfen yönetici ile iletişime geçin.",
        },
        { status: 503 },
      );
    }

    const body = (await request.json()) as PaymentInitializeRequest;
    const amount = Number(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Geçerli bir ödeme tutarı girin." },
        { status: 400 },
      );
    }

    const buyerEmail = body.buyerEmail?.trim() || "user@nexisai.com";
    const buyerName = body.buyerName?.trim() || "NexisAI Kullanıcı";

    const checkout = await initializeIyzicoCheckout({
      userId,
      amount,
      buyerEmail,
      buyerName,
      campaignId: body.campaignId,
      campaignDraft: body.campaignDraft,
      callbackUrl: buildPaymentCallbackUrl(),
    });

    return NextResponse.json({
      success: true,
      checkoutId: checkout.checkoutId,
      token: checkout.token,
      paymentPageUrl: checkout.paymentPageUrl,
      campaignId: body.campaignId ?? null,
    });
  } catch (error) {
    return handleApiRouteError(error, "Ödeme başlatılamadı.");
  }
}
