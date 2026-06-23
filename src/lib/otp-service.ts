import "server-only";

import { createHash, randomInt } from "crypto";
import { prisma } from "@/lib/db";

const OTP_TTL_MS = 10 * 60 * 1000;

function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function generateOtpCode(): string {
  return String(randomInt(100000, 999999));
}

export async function createOtpVerification(
  email: string,
  purpose = "register",
): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  const code = generateOtpCode();

  await prisma.otpVerification.create({
    data: {
      email: normalizedEmail,
      codeHash: hashOtp(code),
      purpose,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  return code;
}

export async function verifyOtpCode(
  email: string,
  code: string,
  purpose = "register",
): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const record = await prisma.otpVerification.findFirst({
    where: {
      email: normalizedEmail,
      purpose,
      verified: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return false;
  }

  const isValid = record.codeHash === hashOtp(code.trim());

  if (isValid) {
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { verified: true },
    });
  }

  return isValid;
}
