import { NextResponse } from "next/server";
import {
  authenticateUser,
  createSessionToken,
  SESSION_COOKIE,
} from "@/lib/auth";
import { registerUser } from "@/lib/users-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
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

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Preencha todos os campos obrigatórios." },
        { status: 400 },
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "As senhas não coincidem." },
        { status: 400 },
      );
    }

    const result = await registerUser(name, email, password);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return NextResponse.json(
        { error: "Conta criada, mas não foi possível entrar. Faça login." },
        { status: 500 },
      );
    }

    const token = createSessionToken(user);
    const res = NextResponse.json({ ok: true, redirect: "/area-cliente/credenciais" });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Falha no cadastro." }, { status: 500 });
  }
}
