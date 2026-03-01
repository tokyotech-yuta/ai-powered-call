import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAudioSignedUrl } from "@/lib/s3";

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
  });

  if (!recording || !recording.audioS3Key) {
    return NextResponse.json(
      { error: "音声ファイルが見つかりません" },
      { status: 404 }
    );
  }

  const signedUrl = await getAudioSignedUrl(recording.audioS3Key);

  return NextResponse.json({ url: signedUrl });
}
