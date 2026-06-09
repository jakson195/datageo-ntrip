import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getRtkCredentialsAction } from "@/lib/rtk/actions";
import { generateGnssQrCode } from "@/lib/gnss/qr-code";
import type { GnssBrand } from "@/lib/gnss/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { brand?: GnssBrand };
  const credsResult = await getRtkCredentialsAction();

  if (!credsResult.success) {
    return NextResponse.json({ error: credsResult.error }, { status: 400 });
  }

  const { credentials } = credsResult;
  const qr = await generateGnssQrCode(
    {
      host: credentials.server,
      port: credentials.port,
      username: credentials.username,
      password: credentials.password,
      mountpoint: credentials.mountpoint,
    },
    body.brand ?? "generic",
  );

  return NextResponse.json({ success: true, ...qr });
}
