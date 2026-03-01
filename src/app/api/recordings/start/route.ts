import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAvailableNumber } from "@/lib/twilio";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  // Freeプランの場合、月5件の上限チェック
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (user?.plan === "FREE") {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const count = await prisma.callRecording.count({
      where: {
        userId: session.user.id,
        createdAt: { gte: thisMonth },
      },
    });

    if (count >= 5) {
      return NextResponse.json(
        { error: "無料プランの月間上限（5件）に達しました" },
        { status: 403 }
      );
    }
  }

  const recordingNumber = getAvailableNumber();

  const recording = await prisma.callRecording.create({
    data: {
      userId: session.user.id,
      recordingNumber,
      status: "WAITING",
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return NextResponse.json({
    recordingNumber,
    sessionId: recording.id,
    telLink: `tel:${recordingNumber}`,
    instruction: "この番号に追加発信し、通話を統合してください",
    callbackUrl: `${appUrl}/api/webhooks/twilio/voice?sessionId=${recording.id}`,
  });
}
