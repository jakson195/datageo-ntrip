import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { clientSubscriptionService } from "@/lib/billing/client-subscription.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const payments = await clientSubscriptionService.getPaymentHistory(session.id);
    return NextResponse.json({ success: true, payments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar pagamentos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
