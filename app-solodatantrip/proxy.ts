import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-constants";
import { verifySessionToken } from "@/lib/session-token";
import { clearSessionCookie, sessionCookieOptions } from "@/lib/session-cookie";
import {
  isSubscriptionActive,
  requiresActiveSubscription,
  subscriptionBlockReason,
} from "@/lib/ntrip/subscription-guard";

const CLIENT_PREFIX = "/area-cliente";

function readSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return { session: null, hasInvalidCookie: false };
  }

  const session = verifySessionToken(token);
  return { session, hasInvalidCookie: !session };
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { session, hasInvalidCookie } = readSession(request);

  if ((pathname === "/login" || pathname === "/cadastro") && session) {
    return NextResponse.redirect(new URL(`${CLIENT_PREFIX}/credenciais`, request.url));
  }

  if (pathname.startsWith(CLIENT_PREFIX) && !session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    const response = NextResponse.redirect(login);
    if (hasInvalidCookie) clearSessionCookie(response);
    return response;
  }

  if (session && requiresActiveSubscription(pathname) && !isSubscriptionActive(session)) {
    const credenciais = new URL(`${CLIENT_PREFIX}/credenciais`, request.url);
    credenciais.searchParams.set("blocked", "1");
    const reason = subscriptionBlockReason(session);
    if (reason) credenciais.searchParams.set("reason", reason);
    return NextResponse.redirect(credenciais);
  }

  if ((pathname === "/login" || pathname === "/cadastro") && hasInvalidCookie) {
    const response = NextResponse.next();
    response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/cadastro", "/area-cliente/:path*"],
};
