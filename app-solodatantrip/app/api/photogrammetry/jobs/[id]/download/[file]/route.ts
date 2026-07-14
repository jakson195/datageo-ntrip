import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getJob } from "@/lib/photogrammetry/job-store";
import { odmDownloadUrl } from "@/lib/photogrammetry/nodeodm-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; file: string }> },
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id, file } = await context.params;
  const assetPath = decodeURIComponent(file);
  const job = await getJob(id);
  if (!job || job.userId !== user.id) {
    return NextResponse.json({ error: "Job não encontrado." }, { status: 404 });
  }

  const output = job.outputs.find((o) => o.fileName === assetPath);
  if (!output) {
    return NextResponse.json({ error: "Arquivo não disponível." }, { status: 404 });
  }

  if (job.mode === "odm" && job.odmTaskId) {
    const odmUrl = odmDownloadUrl(job.odmTaskId, assetPath);
    if (!odmUrl) {
      return NextResponse.json({ error: "NodeODM não configurado." }, { status: 503 });
    }
    try {
      const res = await fetch(odmUrl, { signal: AbortSignal.timeout(120000) });
      if (!res.ok) {
        return NextResponse.json({ error: `Download ODM falhou (${res.status}).` }, { status: 502 });
      }
      const buf = await res.arrayBuffer();
      const fileName = assetPath.split("/").pop() ?? "download";
      return new NextResponse(buf, {
        headers: {
          "Content-Type": output.mimeType,
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Falha ao baixar do NodeODM." },
        { status: 502 },
      );
    }
  }

  const body = `# Demonstração — ${output.label}\nProjeto: ${job.projectId}\nEtapa: ${job.stepId}\nArquivo: ${output.fileName}\n\nInicie o NodeODM (docker compose up nodeodm -d) e configure PHOTOGRAMMETRY_ODM_URL=http://localhost:3002\n`;
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${assetPath.split("/").pop()}.txt"`,
    },
  });
}
