import { NextResponse } from "next/server";

import {
  completeIyzicoCheckout,
  getCheckoutById,
} from "@/lib/iyzico-client";
import { activateCampaignAfterDirectPayment } from "@/lib/campaign-payment-service";
import { resolveSitePath } from "@/lib/site-origin";

function redirectToDashboard(status: "success" | "failed", checkoutId?: string) {
  const url = new URL(resolveSitePath("/dashboard"));
  url.searchParams.set("payment", status);
  if (checkoutId) {
    url.searchParams.set("checkoutId", checkoutId);
  }
  return NextResponse.redirect(url.toString(), 302);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const token = String(formData.get("token") ?? "");

    if (!token) {
      return redirectToDashboard("failed");
    }

    const completed = await completeIyzicoCheckout(token);

    if (!completed) {
      return redirectToDashboard("failed");
    }

    if (completed.isCampaignPayment && completed.campaignId) {
      const userEmail =
        typeof completed.campaignDraft?.buyerEmail === "string"
          ? completed.campaignDraft.buyerEmail
          : "user@nexisai.com";

      await activateCampaignAfterDirectPayment({
        campaignId: completed.campaignId,
        userId: completed.userId,
        userEmail,
        amount: completed.amount,
        checkoutId: completed.checkoutId,
        campaignDraft: completed.campaignDraft,
        request,
      });

      const resumeUrl = new URL(resolveSitePath("/dashboard"));
      resumeUrl.searchParams.set("payment", "success");
      resumeUrl.searchParams.set("campaignStarted", "1");
      resumeUrl.searchParams.set("campaignId", completed.campaignId);
      return NextResponse.redirect(resumeUrl.toString(), 302);
    }

    const checkout = await getCheckoutById(completed.checkoutId);
    const draft = checkout?.campaignDraft as Record<string, unknown> | null;

    if (draft && typeof draft === "object") {
      const resumeUrl = new URL(resolveSitePath("/dashboard"));
      resumeUrl.searchParams.set("payment", "success");
      resumeUrl.searchParams.set("checkoutId", completed.checkoutId);
      return NextResponse.redirect(resumeUrl.toString(), 302);
    }

    return redirectToDashboard("success", completed.checkoutId);
  } catch (error) {
    console.error("[PAYMENTS_CALLBACK]:", error);
    return redirectToDashboard("failed");
  }
}
