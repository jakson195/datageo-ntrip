import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "PENDING";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);

  const subscriptions = await prisma.ntripSubscription.findMany({
    where: {
      deletedAt: null,
      ...(status !== "ALL" ? { status: status as "PENDING" | "ACTIVE" | "SUSPENDED" | "EXPIRED" } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      plan: true,
      user: { select: { id: true, email: true, name: true } },
      ntripAccounts: {
        where: { isPrimary: true, deletedAt: null },
        take: 1,
      },
    },
  });

  return NextResponse.json({
    subscriptions: subscriptions.map((sub) => ({
      id: sub.id,
      status: sub.status.toLowerCase(),
      source: sub.source.toLowerCase(),
      plan: sub.plan.slug,
      planName: sub.plan.name,
      userId: sub.user.id,
      userEmail: sub.user.email,
      userName: sub.user.name,
      expiresAt: sub.expiresAt?.toISOString() ?? null,
      activatedAt: sub.activatedAt?.toISOString() ?? null,
      createdAt: sub.createdAt.toISOString(),
      ntrip: sub.ntripAccounts[0]
        ? {
            host: sub.ntripAccounts[0].host,
            port: sub.ntripAccounts[0].port,
            mountpoint: sub.ntripAccounts[0].mountpoint,
            username: sub.ntripAccounts[0].username,
            status: sub.ntripAccounts[0].status.toLowerCase(),
          }
        : null,
    })),
  });
}
