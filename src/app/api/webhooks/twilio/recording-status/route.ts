import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/lib/inngest";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const recordingStatus = formData.get("RecordingStatus") as string;
  const recordingSid = formData.get("RecordingSid") as string;
  const recordingDuration = formData.get("RecordingDuration") as string;

  if (recordingStatus === "completed" && sessionId) {
    // 録音完了時の処理
    await prisma.callRecording.update({
      where: { id: sessionId },
      data: {
        durationSec: parseInt(recordingDuration, 10) || 0,
        status: "UPLOADING",
      },
    });

    // Inngestイベントを送信して非同期処理パイプラインを開始
    await inngest.send({
      name: "recording/completed",
      data: {
        recordingId: sessionId,
        recordingSid,
      },
    });
  }

  return NextResponse.json({ received: true });
}
