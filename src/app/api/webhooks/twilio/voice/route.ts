import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSilentRecordingTwiML } from "@/lib/twilio";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const callSid = formData.get("CallSid") as string;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const callbackUrl = `${appUrl}/api/webhooks/twilio/recording-status?sessionId=${sessionId}`;

  // セッションIDがある場合、録音レコードを更新
  if (sessionId) {
    await prisma.callRecording.update({
      where: { id: sessionId },
      data: {
        twilioCallSid: callSid,
        status: "RECORDING",
      },
    });
  }

  // サイレント応答TwiMLを返す（ビープ音・ガイダンスなし）
  const twiml = generateSilentRecordingTwiML(callbackUrl);

  return new NextResponse(twiml, {
    headers: {
      "Content-Type": "text/xml",
    },
  });
}
