import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getJob } from "@/lib/photogrammetry/job-store";
import { startPhotogrammetryJob } from "@/lib/photogrammetry/process-job";
import type { PhotogrammetrySettings, PipelineStepId } from "@/lib/photogrammetry/types";
import { DEFAULT_SETTINGS, PIPELINE_STEPS } from "@/lib/photogrammetry/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600;

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const form = await request.formData();
  const projectId = String(form.get("projectId") ?? "");
  const stepId = String(form.get("stepId") ?? "") as PipelineStepId;
  const settingsRaw = form.get("settings");

  if (!projectId) {
    return NextResponse.json({ error: "projectId é obrigatório." }, { status: 400 });
  }
  if (!PIPELINE_STEPS.includes(stepId)) {
    return NextResponse.json({ error: "Etapa inválida." }, { status: 400 });
  }

  let settings: PhotogrammetrySettings = { ...DEFAULT_SETTINGS };
  if (typeof settingsRaw === "string") {
    try {
      settings = { ...DEFAULT_SETTINGS, ...JSON.parse(settingsRaw) };
    } catch {
      return NextResponse.json({ error: "Configurações inválidas." }, { status: 400 });
    }
  }

  const files = form.getAll("images").filter((v): v is File => v instanceof File && v.size > 0);
  if (files.length < 2) {
    return NextResponse.json(
      { error: "Envie pelo menos 2 fotos. Se recarregou a página, importe as fotos novamente." },
      { status: 400 },
    );
  }

  const gcpListRaw = form.get("gcpList");
  const gcpListText =
    typeof gcpListRaw === "string" && gcpListRaw.trim().length > 0 ? gcpListRaw.trim() : null;

  const job = await startPhotogrammetryJob({
    userId: user.id,
    projectId,
    stepId,
    settings,
    files,
    gcpListText,
  });

  return NextResponse.json({ job });
}

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  return NextResponse.json({ ok: true });
}
