import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { id } = await params;

  const recording = await prisma.callRecording.findFirst({
    where: { id, userId: session.user.id },
    include: {
      summary: true,
      transcription: true,
    },
  });

  if (!recording) {
    return NextResponse.json({ error: "録音が見つかりません" }, { status: 404 });
  }

  return NextResponse.json({
    summary: recording.summary,
    transcription: recording.transcription,
    status: recording.status,
  });
}
