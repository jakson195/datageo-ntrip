import { NextResponse } from "next/server";
import { authenticateUser } from "@/lib/auth";
import { getDatabaseConfigStatus } from "@/lib/db/is-database-configured";
import { mapDbErrorToMessage } from "@/lib/db/with-db-retry";
import { validateEmail } from "@/lib/password-validation";
import { jsonWithSession } from "@/lib/session-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  const dbStatus = getDatabaseConfigStatus();
  if (!dbStatus.configured) {
    return NextResponse.json(
      { error: dbStatus.friendlyError ?? "Autenticação indisponível. Configure PostgreSQL." },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";

    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) {
      return NextResponse.json({ error: emailCheck.error }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: "Informe a senha." }, { status: 400 });
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos." },
        { status: 401 },
      );
    }

    return jsonWithSession(user);
  } catch (error) {
    console.error("[auth/login]", error);
    const message = error instanceof Error ? error.message : mapDbErrorToMessage(error);
    const status = message.includes("PostgreSQL") || message.includes("banco") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
