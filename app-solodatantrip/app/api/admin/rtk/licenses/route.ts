import { NextResponse } from "next/server";
import { rtkLicenseRepository } from "@/lib/db/repositories/rtk-license.repository";
import type { AdminLicenseFilters } from "@/lib/db/dtos";
import type { RtkLicenseStatus } from "@/lib/rtk/license-status";

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
    const filters: AdminLicenseFilters = {
      page: Number(searchParams.get("page") ?? "1"),
      limit: Number(searchParams.get("limit") ?? "20"),
      plan: searchParams.get("plan") ?? undefined,
      status: (searchParams.get("status") as RtkLicenseStatus | null) ?? undefined,
      expiringWithinDays: searchParams.get("expiringWithinDays")
        ? Number(searchParams.get("expiringWithinDays"))
        : undefined,
    };

    const result = await rtkLicenseRepository.getAdminLicenseList(filters);
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ error: "Falha ao listar licenças." }, { status: 500 });
  }
}
