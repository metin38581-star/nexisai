import { NextResponse } from "next/server";

import { handleApiRouteError } from "@/lib/api-error";
import { createOtpVerification } from "@/lib/otp-service";
import { sendOtpEmail } from "@/lib/email-service";

interface OtpSendRequest {
  email?: string;
  purpose?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OtpSendRequest;
    const email = body.email?.trim() ?? "";
    const purpose = body.purpose?.trim() || "register";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: "Geçerli bir e-posta adresi girin." },
        { status: 400 },
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
