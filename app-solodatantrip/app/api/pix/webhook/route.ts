import { NextResponse } from "next/server";
import { mercadoPagoService } from "@/lib/billing/mercadopago.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    await mercadoPagoService.handleWebhook(body);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[pix/webhook]", error);
    return NextResponse.json({ error: "Webhook inválido." }, { status: 400 });
  }
}
