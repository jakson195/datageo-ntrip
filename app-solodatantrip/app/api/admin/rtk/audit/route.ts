import { NextResponse } from "next/server";
import { getRtkAuditLogsPaginated } from "@/lib/rtk/audit-log";
import type { AuditActionDto } from "@/lib/db/dtos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

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
    const { searchParams } = new URL(request.url);
    const result = await getRtkAuditLogsPaginated({
      page: Number(searchParams.get("page") ?? "1"),
      limit: Number(searchParams.get("limit") ?? "20"),
      userId: searchParams.get("userId") ?? undefined,
      licenseId: searchParams.get("licenseId") ?? undefined,
      action: (searchParams.get("action") as AuditActionDto | null) ?? undefined,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ error: "Falha ao listar logs de auditoria." }, { status: 500 });
  }
}
