import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMercadoPagoPublicKey } from "@/lib/billing/mp-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const publicKey = getMercadoPagoPublicKey();
  return NextResponse.json({
    configured: Boolean(publicKey),
    publicKey: publicKey ?? "",
  });
}
