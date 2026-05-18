import { NextResponse } from "next/server";
import { readJob, updateJob } from "@/lib/jobs";
import { runProcessing } from "@/lib/processing";
import { isValidJobId } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { jobId?: string };
    const jobId = body.jobId?.trim();

    if (!jobId || !isValidJobId(jobId)) {
      return NextResponse.json({ error: "jobId inválido." }, { status: 400 });
    }

    const job = await readJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job não encontrado." }, { status: 404 });
    }

    if (job.status === "ready") {
      return NextResponse.json({ jobId, status: "ready", message: "Já processado." });
    }

    if (job.status === "processing") {
      return NextResponse.json({
        jobId,
        status: "processing",
        message: "Processamento já em andamento.",
      });
    }

    await updateJob(jobId, {
      status: "processing",
      progress: 2,
      message: "Processamento na fila…",
    });

    // Fire-and-forget; client polls GET /api/jobs/[id]
    void runProcessing(jobId).catch((err) => {
      console.error("[process]", jobId, err);
    });

    return NextResponse.json({
      jobId,
      status: "processing",
      message: "Processamento iniciado.",
    });
  } catch (err) {
    console.error("[process]", err);
    return NextResponse.json(
      { error: "Não foi possível iniciar o processamento." },
      { status: 500 },
    );
  }
}
