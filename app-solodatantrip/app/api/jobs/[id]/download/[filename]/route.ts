import fs from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";
import { readJob } from "@/lib/jobs";
import { getOutputDir, isValidJobId, sanitizeFilename } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_OUTPUT = new Set(["preview-mosaico.jpg", "resultados.zip"]);

type RouteContext = {
  params: Promise<{ id: string; filename: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id, filename: encoded } = await context.params;
  const filename = sanitizeFilename(decodeURIComponent(encoded));

  if (!isValidJobId(id)) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  if (!ALLOWED_OUTPUT.has(filename)) {
    return NextResponse.json({ error: "Arquivo não permitido." }, { status: 404 });
  }

  const job = await readJob(id);
  if (!job || job.status !== "ready") {
    return NextResponse.json(
      { error: "Resultado ainda não disponível." },
      { status: 404 },
    );
  }

  const filePath = path.join(getOutputDir(id), filename);

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    }

    const buffer = await fs.readFile(filePath);
    const contentType =
      filename.endsWith(".zip")
        ? "application/zip"
        : filename.endsWith(".jpg")
          ? "image/jpeg"
          : "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(stat.size),
      },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }
}
