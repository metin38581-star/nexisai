import { NextResponse } from "next/server";

import { handleApiRouteError } from "@/lib/api-error";
import { checkRateLimit } from "@/lib/rate-limit";
import { createOtpVerification } from "@/lib/otp-service";
import { sendOtpEmail } from "@/lib/email-service";

interface OtpSendRequest {
  email?: string;
  purpose?: string;
}

export async function POST(request: Request) {
  try {
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const clientKey = forwarded || request.headers.get("x-real-ip") || "unknown";

    const body = (await request.json()) as OtpSendRequest;
    const email = body.email?.trim() ?? "";
    const purpose = body.purpose?.trim() || "register";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: "Geçerli bir e-posta adresi girin." },
        { status: 400 },
      );
    }

    const emailLimit = checkRateLimit(`otp-email:${email}`, 5, 60 * 60 * 1000);
    const ipLimit = checkRateLimit(`otp-ip:${clientKey}`, 20, 60 * 60 * 1000);

    if (!emailLimit.allowed || !ipLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Çok fazla doğrulama isteği. Lütfen daha sonra tekrar deneyin.",
        },
        { status: 429 },
      );
    }

    const code = await createOtpVerification(email, purpose);
    await sendOtpEmail(email, code);

    return NextResponse.json({
      success: true,
      message: "Doğrulama kodu e-posta adresinize gönderildi.",
    });
  } catch (error) {
    return handleApiRouteError(error, "OTP gönderilemedi.");
  }
}
