import { NextResponse } from "next/server";

import { completeIyzicoCheckout, getCheckoutById } from "@/lib/iyzico-client";
import { normalizeCampaignApiRequest } from "@/lib/campaign-api-normalize";

function redirectToDashboard(status: "success" | "failed", checkoutId?: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ??
    "http://localhost:3000";

  const url = new URL("/dashboard", base);
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

    const checkout = await getCheckoutById(completed.checkoutId);
    const draft = checkout?.campaignDraft as Record<string, unknown> | null;

    if (draft && typeof draft === "object") {
      const normalized = normalizeCampaignApiRequest(draft as never);
      const siteOrigin =
        process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ??
        process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ??
        "http://localhost:3000";

      const resumeUrl = new URL("/dashboard", siteOrigin);
      resumeUrl.searchParams.set("payment", "success");
      resumeUrl.searchParams.set("resumeCampaign", "1");
      resumeUrl.searchParams.set("companyName", normalized.markaAdi);
      resumeUrl.searchParams.set("sector", normalized.sektor);
      resumeUrl.searchParams.set("sectorSlug", normalized.sectorSlug);
      resumeUrl.searchParams.set("city", normalized.sehir);
      resumeUrl.searchParams.set("budget", String(normalized.gunlukButce));
      resumeUrl.searchParams.set("campaignDays", String(normalized.gunSayisi));
      if (normalized.selectedQuestionIds.length > 0) {
        resumeUrl.searchParams.set(
          "selectedQuestionIds",
          normalized.selectedQuestionIds.join(","),
        );
      }

      return NextResponse.redirect(resumeUrl.toString(), 302);
    }

    return redirectToDashboard("success", completed.checkoutId);
  } catch (error) {
    console.error("[payments/callback]", error);
    return redirectToDashboard("failed");
  }
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return redirectToDashboard("failed");
  }

  const completed = await completeIyzicoCheckout(token);
  if (!completed) {
    return redirectToDashboard("failed");
  }

  return redirectToDashboard("success", completed.checkoutId);
}
