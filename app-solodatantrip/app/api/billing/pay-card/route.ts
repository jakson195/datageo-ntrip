import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { mercadoPagoService } from "@/lib/billing/mercadopago.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PayCardBody = {
  planSlug?: string;
  token?: string;
  payment_method_id?: string;
  paymentMethodId?: string;
  issuer_id?: string;
  issuerId?: string;
  installments?: number;
  transaction_amount?: number;
  transactionAmount?: number;
  payer?: {
    email?: string;
    identification?: { type?: string; number?: string };
  };
};

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as PayCardBody;
    const planSlug = body.planSlug?.trim() || "mensal";
    const token = body.token?.trim();
    const paymentMethodId = body.payment_method_id ?? body.paymentMethodId;
    const issuerId = String(body.issuer_id ?? body.issuerId ?? "");
    const installments = body.installments ?? 1;
    const transactionAmount = body.transaction_amount ?? body.transactionAmount ?? 0;

    if (!token || !paymentMethodId || !issuerId) {
      return NextResponse.json({ error: "Dados do cartão incompletos." }, { status: 400 });
    }

    const result = await mercadoPagoService.createDirectCardPayment(
      session.id,
      session.email,
      planSlug,
      {
        token,
        paymentMethodId,
        issuerId,
        installments,
        transactionAmount,
        payer: body.payer ?? { email: session.email },
      },
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao processar cartão.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
