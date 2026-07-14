import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { checkOdmHealth, getOdmBaseUrl, isOdmConfigured } from "@/lib/photogrammetry/nodeodm-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const configured = isOdmConfigured();
  const url = getOdmBaseUrl();
  if (!configured) {
    return NextResponse.json({
      configured: false,
      available: false,
      url: null,
      message: "PHOTOGRAMMETRY_ODM_URL não configurada — usando modo demonstração.",
    });
  }

  const health = await checkOdmHealth();
  return NextResponse.json({
    configured: true,
    available: health.ok,
    url,
    version: health.version,
    message: health.ok
      ? `NodeODM conectado (${health.version}).`
      : health.error ?? "NodeODM indisponível — usando modo demonstração.",
  });
}
