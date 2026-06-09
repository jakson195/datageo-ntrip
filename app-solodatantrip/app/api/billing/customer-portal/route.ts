import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { stripeService } from "@/lib/billing/stripe.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const url = await stripeService.createCustomerPortal(session.id);
    return NextResponse.json({ success: true, url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao abrir portal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
