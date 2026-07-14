import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { SESSION_COOKIE } from "@/lib/auth-constants";
import { verifySessionToken } from "@/lib/session-token";
import { clearSessionCookie, sessionCookieOptions } from "@/lib/session-cookie";
import {
  isSubscriptionActive,
  requiresActiveSubscription,
  subscriptionBlockReason,
} from "@/lib/ntrip/subscription-guard";

const intlMiddleware = createIntlMiddleware(routing);
const CLIENT_PREFIX = "/area-cliente";

function stripLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}

function readSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return { session: null, hasInvalidCookie: false };
  const session = verifySessionToken(token);
  return { session, hasInvalidCookie: !session };
}

export function proxy(request: NextRequest) {
  const intlResponse = intlMiddleware(request);
  const pathname = request.nextUrl.pathname;
  const barePath = stripLocale(pathname);
  const { session, hasInvalidCookie } = readSession(request);

  if ((barePath === "/login" || barePath === "/cadastro") && session) {
    return NextResponse.redirect(new URL(`${CLIENT_PREFIX}/credenciais`, request.url));
  }

  if (barePath.startsWith(CLIENT_PREFIX) && !session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", barePath);
    const response = NextResponse.redirect(login);
    if (hasInvalidCookie) clearSessionCookie(response);
    return response;
  }

  if (session && requiresActiveSubscription(barePath) && !isSubscriptionActive(session)) {
    const credenciais = new URL(`${CLIENT_PREFIX}/credenciais`, request.url);
    credenciais.searchParams.set("blocked", "1");
    const reason = subscriptionBlockReason(session);
    if (reason) credenciais.searchParams.set("reason", reason);
    return NextResponse.redirect(credenciais);
  }

  if ((barePath === "/login" || barePath === "/cadastro") && hasInvalidCookie) {
    const response = NextResponse.next();
    response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
    return response;
  }

  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
