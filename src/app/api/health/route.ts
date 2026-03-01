import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const checks: Record<string, unknown> = {};

  // 1. 環境変数チェック
  checks.env = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    AUTH_SECRET: !!process.env.AUTH_SECRET,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "(not set)",
    NODE_ENV: process.env.NODE_ENV,
  };

  // 2. DBの接続チェック
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { connected: true };
  } catch (e) {
    checks.database = {
      connected: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  // 3. テーブル存在チェック
  if ((checks.database as { connected: boolean }).connected) {
    try {
      const userCount = await prisma.user.count();
      checks.tables = { userTable: true, userCount };
    } catch (e) {
      checks.tables = {
        userTable: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  const allOk =
    (checks.database as { connected: boolean }).connected &&
    (!checks.tables || (checks.tables as { userTable: boolean }).userTable);

  return NextResponse.json(
    { ok: allOk, checks },
    { status: allOk ? 200 : 503 }
  );
}
