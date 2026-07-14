import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { clientSubscriptionService } from "@/lib/billing/client-subscription.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const result = await clientSubscriptionService.cancelSubscription(session.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao cancelar assinatura.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
