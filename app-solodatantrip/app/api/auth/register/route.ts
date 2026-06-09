import { NextResponse } from "next/server";
import { authenticateUser } from "@/lib/auth";
import { findUserByEmail, userDtoToDashboardSession } from "@/lib/users-store";
import { getDatabaseConfigStatus } from "@/lib/db/is-database-configured";
import { ensurePrismaConnected } from "@/lib/db/prisma";
import { mapDbErrorToMessage, withDbRetry } from "@/lib/db/with-db-retry";
import { validateEmail, validateName, validatePassword } from "@/lib/password-validation";
import { jsonWithSession } from "@/lib/session-cookie";
import { registerUser } from "@/lib/users-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const dbStatus = getDatabaseConfigStatus();
  if (!dbStatus.configured) {
    return NextResponse.json(
      { error: dbStatus.friendlyError ?? "Cadastro indisponível. Configure PostgreSQL." },
      { status: 503 },
    );
  }

  try {
    await ensurePrismaConnected();
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    };

    const name = body.name?.trim() ?? "";
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";
    const confirmPassword = body.confirmPassword ?? "";

    const nameCheck = validateName(name);
    if (!nameCheck.ok) {
      return NextResponse.json({ error: nameCheck.error }, { status: 400 });
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) {
      return NextResponse.json({ error: emailCheck.error }, { status: 400 });
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.ok) {
      return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "As senhas não coincidem." }, { status: 400 });
    }

    const result = await withDbRetry(
      () => registerUser(name, email, password),
      "auth-register",
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const stored = await findUserByEmail(email);
    const user = stored ? userDtoToDashboardSession(stored) : await authenticateUser(email, password);
    if (!user) {
      return NextResponse.json(
        { error: "Conta criada, mas não foi possível entrar. Faça login." },
        { status: 500 },
      );
    }

    return jsonWithSession(user);
  } catch (error) {
    console.error("[auth/register]", error);
    const message = mapDbErrorToMessage(error);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
