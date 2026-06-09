import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { testNtripConnection } from "@/lib/gnss/ntrip-tester";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = (await request.json()) as {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    mountpoint?: string;
  };

  const host = body.host ?? session.ntrip.server;
  const port = body.port ?? Number(session.ntrip.port);
  const username = body.username ?? session.ntrip.username;
  const mountpoint = body.mountpoint ?? session.ntrip.mountpoint;

  if (!host || !username || username === "NONE") {
    return NextResponse.json({ error: "Credenciais RTK indisponíveis." }, { status: 400 });
  }

  const result = await testNtripConnection({
    host,
    port,
    username,
    password: body.password ?? "",
    mountpoint,
  });

  return NextResponse.json({ success: true, result });
}
