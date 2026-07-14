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

    const overview = await clientSubscriptionService.getOverview(session.id);
    const purchasablePlans = await clientSubscriptionService.listPurchasablePlans();
    return NextResponse.json({
      success: true,
      overview,
      payerEmail: session.email,
      purchasablePlans,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar assinatura.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
