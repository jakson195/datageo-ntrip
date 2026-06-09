import { NextResponse } from "next/server";
import { createRtkLicenseAction } from "@/lib/rtk/actions";
import { getClientIp } from "@/lib/rtk/audit-log";
import { isRtkApiConfigured } from "@/lib/rtk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function mapErrorStatus(code: string | undefined): number {
  switch (code) {
    case "UNAUTHENTICATED":
      return 401;
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "RATE_LIMITED":
      return 429;
    case "EXTERNAL_ERROR":
      return 502;
    case "NOT_CONFIGURED":
      return 503;
    default:
      return 400;
  }
}

export async function POST(request: Request) {
  try {
    if (!isRtkApiConfigured()) {
      return NextResponse.json(
        { success: false, error: "Provisionamento RTK não configurado no servidor." },
        { status: 503 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as { plan?: string };
    const clientIp = getClientIp(request);
    const result = await createRtkLicenseAction(body.plan, clientIp);

    if (!result.success) {
      return NextResponse.json(result, { status: mapErrorStatus(result.code) });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { success: false, error: "Falha ao provisionar licença RTK." },
      { status: 500 },
    );
  }
}
