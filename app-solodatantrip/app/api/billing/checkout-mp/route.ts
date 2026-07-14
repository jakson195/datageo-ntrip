import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { mercadoPagoService } from "@/lib/billing/mercadopago.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as { planSlug?: string; mode?: "card" | "recurring" };
    const planSlug = body.planSlug?.trim() || "mensal";
    const mode = body.mode ?? "card";

    if (mode === "recurring") {
      const recurring = await mercadoPagoService.createRecurringSubscription(
        session.id,
        session.email,
        planSlug,
      );
      return NextResponse.json({ success: true, ...recurring });
    }

    const checkout = await mercadoPagoService.createCardCheckout(
      session.id,
      session.email,
      planSlug,
    );
    return NextResponse.json({ success: true, ...checkout });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao iniciar checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
