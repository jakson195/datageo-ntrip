import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-constants";

const CLIENT_PREFIX = "/area-cliente";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if ((pathname === "/login" || pathname === "/cadastro") && hasSession) {
    return NextResponse.redirect(new URL(`${CLIENT_PREFIX}/credenciais`, request.url));
  }

  if (pathname.startsWith(CLIENT_PREFIX) && !hasSession) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/cadastro", "/area-cliente/:path*"],
};
