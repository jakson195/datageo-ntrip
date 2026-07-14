import { NextResponse } from "next/server";
import { getSession, createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { updateClientRtkCredentials } from "@/lib/client/rtk-credentials.service";
import { sessionCookieOptions } from "@/lib/session-cookie";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const result = await updateClientRtkCredentials(session.id, {
      username: body.username,
      password: body.password,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const token = createSessionToken(result.session);
    const res = NextResponse.json({
      ok: true,
      message: "Credenciais RTK atualizadas com sucesso.",
      ntrip: result.session.ntrip,
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar as credenciais RTK." }, { status: 500 });
  }
}
