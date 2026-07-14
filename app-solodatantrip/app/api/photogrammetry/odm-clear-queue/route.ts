import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prepareOdmQueueForNewJob } from "@/lib/photogrammetry/nodeodm-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const result = await prepareOdmQueueForNewJob();
  return NextResponse.json({
    ok: true,
    cancelled: result.cancelled,
    message:
      result.cancelled > 0
        ? `${result.cancelled} tarefa(s) cancelada(s) na fila do NodeODM.`
        : "Fila do NodeODM já estava livre.",
  });
}
