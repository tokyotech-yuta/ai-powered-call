import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteAudio } from "@/lib/s3";

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
      transcription: true,
      summary: true,
    },
  });

  if (!recording) {
    return NextResponse.json({ error: "録音が見つかりません" }, { status: 404 });
  }

  return NextResponse.json(recording);
}

export async function DELETE(
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
  });

  if (!recording) {
    return NextResponse.json({ error: "録音が見つかりません" }, { status: 404 });
  }

  // S3から音声ファイルを削除
  if (recording.audioS3Key) {
    await deleteAudio(recording.audioS3Key);
  }

  await prisma.callRecording.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
