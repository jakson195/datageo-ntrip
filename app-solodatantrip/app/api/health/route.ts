import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {
    app: "ok",
    database: "unknown",
    timestamp: new Date().toISOString(),
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
    return NextResponse.json({ status: "healthy", checks });
  } catch {
    checks.database = "error";
    return NextResponse.json({ status: "degraded", checks }, { status: 503 });
  }
}
