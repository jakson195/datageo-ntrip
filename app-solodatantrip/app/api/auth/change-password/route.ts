import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { changeAccountPassword } from "@/lib/auth/password-reset.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { currentPassword?: string; newPassword?: string };
    const currentPassword = body.currentPassword ?? "";
    const newPassword = body.newPassword ?? "";

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Informe a senha atual e a nova senha." }, { status: 400 });
    }

    const result = await changeAccountPassword(session.id, currentPassword, newPassword);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: "Senha da conta alterada com sucesso." });
  } catch {
    return NextResponse.json({ error: "Não foi possível alterar a senha." }, { status: 500 });
  }
}
