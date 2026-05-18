import { NextResponse } from "next/server";
import { readJob } from "@/lib/jobs";
import { isValidJobId } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidJobId(id)) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const job = await readJob(id);
  if (!job) {
    return NextResponse.json({ error: "Job não encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    id: job.id,
    projectName: job.projectName,
    status: job.status,
    progress: job.progress,
    message: job.message,
    fileCount: job.fileCount,
    downloads: job.downloads,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
}
