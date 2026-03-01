import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const recordings = await prisma.callRecording.findMany({
    where: { userId: session.user.id },
    include: {
      summary: {
        select: {
          summaryText: true,
          topics: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(recordings);
}
