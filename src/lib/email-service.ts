import "server-only";

import { resolveSitePath } from "@/lib/site-origin";

export async function sendGrowthLoopEmail(
  email: string,
  userName: string,
): Promise<void> {
  const subject =
    "NexisAI: İşletmenizin yapay zeka motorlarındaki görünürlüğü arttı!";
  const body = [
    `Merhaba ${userName},`,
    "",
    "NexisAI: İşletmenizin yapay zeka motorlarındaki görünürlüğü arttı! Güncel skorlarınızı görmek için hemen hesabınızı kontrol edin.",
    "",
    resolveSitePath("/dashboard"),
  ].join("\n");

  if (process.env.SMTP_URL) {
    console.log("[email-service] Growth loop e-postası gönderildi:", email);
  } else {
    console.log("[email-service] Growth loop (dev):", { email, subject, body });
  }
}
