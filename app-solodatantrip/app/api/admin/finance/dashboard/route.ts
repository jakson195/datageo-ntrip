import { NextResponse } from "next/server";
import { financeDashboardService } from "@/lib/billing/finance-dashboard.service";

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

  try {
    const stats = await financeDashboardService.getDashboard();
    return NextResponse.json({ ok: true, stats });
  } catch {
    return NextResponse.json({ error: "Falha ao carregar dashboard financeiro." }, { status: 500 });
  }
}
