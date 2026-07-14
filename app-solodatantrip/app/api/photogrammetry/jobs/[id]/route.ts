import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getJob } from "@/lib/photogrammetry/job-store";
import { refreshPhotogrammetryJob } from "@/lib/photogrammetry/process-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await context.params;
  let job = await getJob(id);
  if (!job || job.userId !== user.id) {
    return NextResponse.json({ error: "Job não encontrado." }, { status: 404 });
  }

  job = (await refreshPhotogrammetryJob(id)) ?? job;
  return NextResponse.json({ job });
}
