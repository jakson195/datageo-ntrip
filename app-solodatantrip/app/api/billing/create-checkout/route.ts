import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { stripeService } from "@/lib/billing/stripe.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as { planSlug?: string };
    const planSlug = body.planSlug?.trim() || "mensal";

    const checkout = await stripeService.createCheckoutSession(
      session.id,
      session.email,
      session.name,
      planSlug,
    );

    return NextResponse.json({ success: true, url: checkout.url, sessionId: checkout.sessionId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao criar checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
