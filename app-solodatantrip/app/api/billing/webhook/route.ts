import { NextResponse } from "next/server";
import { stripeService } from "@/lib/billing/stripe.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Assinatura ausente." }, { status: 400 });
  }

  try {
    const rawBody = await request.text();
    await stripeService.handleWebhook(rawBody, signature);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[billing/webhook]", error);
    return NextResponse.json({ error: "Webhook inválido." }, { status: 400 });
  }
}
