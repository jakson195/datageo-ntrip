import { NextResponse } from "next/server";
import { mercadoPagoService } from "@/lib/billing/mercadopago.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizePayload(
  body: Record<string, unknown>,
  searchParams: URLSearchParams,
): Record<string, unknown> {
  const topic = searchParams.get("topic") ?? searchParams.get("type");
  const id = searchParams.get("id") ?? searchParams.get("data.id");

  if (topic && id) {
    return {
      ...body,
      type: body.type ?? topic,
      topic,
      id: body.id ?? id,
      action: body.action ?? topic,
      data: body.data ?? { id },
    };
  }

  return body;
}

async function processWebhook(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    let body: Record<string, unknown> = {};

    if (request.method === "POST") {
      const contentType = request.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        body = (await request.json()) as Record<string, unknown>;
      } else {
        const text = await request.text();
        if (text.trim()) {
          try {
            body = JSON.parse(text) as Record<string, unknown>;
          } catch {
            body = { raw: text };
          }
        }
      }
    }

    const payload = normalizePayload(body, url.searchParams);
    await mercadoPagoService.handleWebhook(payload);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[webhooks/mercadopago]", error);
    return NextResponse.json({ error: "Webhook inválido." }, { status: 400 });
  }
}

/** Mercado Pago IPN (notificação clássica via query string) */
export async function GET(request: Request) {
  return processWebhook(request);
}

/** Mercado Pago Webhooks (JSON) */
export async function POST(request: Request) {
  return processWebhook(request);
}
