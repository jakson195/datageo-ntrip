import { NextResponse } from "next/server";
import type { SessionUser } from "@/lib/auth-types";
import { SESSION_COOKIE } from "@/lib/auth-constants";
import { createSessionToken } from "@/lib/session-token";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export function jsonWithSession(user: SessionUser, redirect = "/area-cliente/credenciais") {
  const token = createSessionToken(user);
  const res = NextResponse.json({ ok: true, redirect });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
