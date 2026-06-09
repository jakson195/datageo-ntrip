import { NextResponse } from "next/server";
import { ntripSubscriptionActivationService } from "@/lib/ntrip/subscription-activation.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      userId?: string;
      planSlug?: string;
      actorEmail?: string;
    };

    const userId = body.userId?.trim();
    const planSlug = body.planSlug?.trim() || "trial";
    const actorEmail = body.actorEmail?.trim() || "admin@manual";

    if (!userId) {
      return NextResponse.json({ error: "userId é obrigatório." }, { status: 400 });
    }

    const result = await ntripSubscriptionActivationService.activateManual(
      userId,
      planSlug,
      actorEmail,
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      subscriptionId: result.subscriptionId,
      licenseId: result.licenseId,
    });
  } catch (error) {
    console.error("[admin/subscriptions/activate]", error);
    return NextResponse.json({ error: "Falha na ativação manual." }, { status: 500 });
  }
}
