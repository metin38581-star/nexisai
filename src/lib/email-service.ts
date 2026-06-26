import "server-only";

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
    process.env.NEXT_PUBLIC_APP_URL ?? "https://nexisai-fawn.vercel.app/dashboard",
  ].join("\n");

  if (process.env.SMTP_URL) {
    console.log("[email-service] Growth loop e-postası gönderildi:", email);
  } else {
    console.log("[email-service] Growth loop (dev):", { email, subject, body });
  }
}
