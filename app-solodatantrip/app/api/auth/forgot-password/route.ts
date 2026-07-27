import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/auth/password-reset.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim() ?? "";
    if (!email) {
      return NextResponse.json({ error: "Informe seu e-mail." }, { status: 400 });
    }

    const result = await requestPasswordReset(email);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: result.devResetUrl
        ? "Ambiente local: use o link abaixo para redefinir sua senha (válido por 1 hora)."
        : "Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha em alguns minutos.",
      devResetUrl: result.devResetUrl,
    });
  } catch (err) {
    console.error("[auth/forgot-password]", err);
    return NextResponse.json({ error: "Não foi possível processar o pedido." }, { status: 500 });
  }
}
