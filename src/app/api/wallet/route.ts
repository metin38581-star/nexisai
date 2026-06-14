import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

async function getOrCreateWallet() {
  let wallet = await prisma.wallet.findFirst();

  if (!wallet) {
    wallet = await prisma.wallet.create({ data: { balance: 500.0 } });
  }

  return wallet;
}

export async function GET() {
  try {
    const wallet = await getOrCreateWallet();

    return NextResponse.json({
      id: wallet.id,
      balance: wallet.balance,
    });
  } catch (error) {
    console.error("[WALLET_GET_ERROR]:", error);
    return NextResponse.json(
      { error: "Cüzdan bakiyesi alınamadı." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { amount?: number };
    const amount = Number(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Geçerli bir yükleme miktarı girin." },
        { status: 400 },
      );
    }

    const wallet = await getOrCreateWallet();

    const updated = await prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: amount } },
    });

    console.log(`[CÜZDAN_YÜKLEME]: +$${amount} — yeni bakiye $${updated.balance}`);

    return NextResponse.json({
      success: true,
      balance: updated.balance,
    });
  } catch (error) {
    console.error("[WALLET_TOPUP_ERROR]:", error);
    return NextResponse.json(
      { error: "Bakiye yüklenirken bir hata oluştu." },
      { status: 500 },
    );
  }
}
