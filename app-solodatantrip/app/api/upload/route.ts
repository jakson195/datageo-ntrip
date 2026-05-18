import { randomUUID } from "crypto";
import fs from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";
import { ALLOWED_EXTENSIONS, MAX_FILE_BYTES } from "@/lib/constants";
import { createEmptyJob, writeJob } from "@/lib/jobs";
import {
  ensureJobDirs,
  getExtension,
  getInputDir,
  sanitizeFilename,
} from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const projectNameRaw = formData.get("projectName");
    const projectName =
      typeof projectNameRaw === "string" && projectNameRaw.trim()
        ? projectNameRaw.trim().slice(0, 120)
        : null;

    const fileEntries = formData.getAll("files");
    const files = fileEntries.filter(
      (entry): entry is File =>
        typeof entry === "object" &&
        entry !== null &&
        "arrayBuffer" in entry &&
        typeof (entry as File).arrayBuffer === "function",
    );

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Envie pelo menos uma imagem (jpg, png ou tiff)." },
        { status: 400 },
      );
    }

    const jobId = randomUUID();
    await ensureJobDirs(jobId);

    const savedNames: string[] = [];
    const usedNames = new Set<string>();

    for (const file of files) {
      const ext = getExtension(file.name);
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return NextResponse.json(
          {
            error: `Formato não permitido: ${file.name}. Use jpg, png ou tiff.`,
          },
          { status: 400 },
        );
      }

      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          {
            error: `Arquivo muito grande (máx. 50 MB): ${file.name}`,
          },
          { status: 400 },
        );
      }

      let safeName = sanitizeFilename(file.name);
      if (!path.extname(safeName)) {
        safeName += `.${ext === "jpg" ? "jpg" : ext}`;
      }

      let finalName = safeName;
      let counter = 1;
      while (usedNames.has(finalName.toLowerCase())) {
        const parsed = path.parse(safeName);
        finalName = `${parsed.name}_${counter}${parsed.ext || `.${ext}`}`;
        counter += 1;
      }
      usedNames.add(finalName.toLowerCase());

      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(path.join(getInputDir(jobId), finalName), buffer);
      savedNames.push(finalName);
    }

    const job = createEmptyJob(jobId, projectName, savedNames.length);
    await writeJob(job);

    return NextResponse.json({
      jobId,
      fileCount: savedNames.length,
      files: savedNames,
      projectName,
    });
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json(
      { error: "Falha ao receber os arquivos." },
      { status: 500 },
    );
  }
}
