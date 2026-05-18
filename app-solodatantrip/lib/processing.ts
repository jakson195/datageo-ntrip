import { createRequire } from "module";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import sharp from "sharp";

const require = createRequire(import.meta.url);
// archiver is CJS; default import fails under Turbopack ESM bundling
const archiver = require("archiver") as typeof import("archiver");
import {
  buildDownloadUrl,
  listInputImages,
  readJob,
  updateJob,
  type JobDownload,
} from "./jobs";
import { getOutputDir } from "./uploads";

const PREVIEW_NAME = "preview-mosaico.jpg";
const ZIP_NAME = "resultados.zip";

/**
 * MVP processing pipeline (local stub).
 *
 * Production would enqueue this job to a worker (Redis/Bull, SQS, etc.) that runs
 * OpenDroneMap / WebODM or a cloud photogrammetry API, then stores orthomosaic,
 * DSM, point cloud, and report in object storage (S3/GCS).
 *
 * Env vars for production integration (examples):
 * - ODM_API_URL / WEBODM_URL — WebODM task API
 * - PROCESSING_WORKER_WEBHOOK — callback when ODM task completes
 * - S3_BUCKET, AWS_* — durable artifact storage
 */
export async function runProcessing(jobId: string): Promise<void> {
  const job = await readJob(jobId);
  if (!job) throw new Error("Job não encontrado");

  if (job.status === "processing") return;
  if (job.status === "ready") return;

  const images = await listInputImages(jobId);
  if (images.length === 0) {
    await updateJob(jobId, {
      status: "error",
      progress: 0,
      message: "Nenhuma imagem encontrada para processar.",
      error: "NO_IMAGES",
    });
    return;
  }

  await updateJob(jobId, {
    status: "processing",
    progress: 5,
    message: "Validando imagens…",
    error: null,
  });

  const outputDir = getOutputDir(jobId);
  await fsPromises.mkdir(outputDir, { recursive: true });

  try {
    await updateJob(jobId, {
      progress: 25,
      message: "Gerando pré-visualização (mosaico)…",
    });

    const previewPath = path.join(outputDir, PREVIEW_NAME);
    await createPreviewMosaic(images, previewPath);

    await updateJob(jobId, {
      progress: 70,
      message: "Empacotando resultados…",
    });

    const zipPath = path.join(outputDir, ZIP_NAME);
    await createResultsZip(jobId, images, previewPath, zipPath);

    const downloads: JobDownload[] = [
      {
        name: PREVIEW_NAME,
        url: buildDownloadUrl(jobId, PREVIEW_NAME),
        label: "Pré-visualização (mosaico JPG)",
      },
      {
        name: ZIP_NAME,
        url: buildDownloadUrl(jobId, ZIP_NAME),
        label: "Pacote ZIP (prévia + miniaturas)",
      },
    ];

    await updateJob(jobId, {
      status: "ready",
      progress: 100,
      message:
        "Processamento concluído. Baixe a pré-visualização ou o ZIP. Em produção, aqui estariam ortomosaico GeoTIFF, DSM e nuvem de pontos.",
      downloads,
      error: null,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro desconhecido no processamento";
    await updateJob(jobId, {
      status: "error",
      progress: 0,
      message: `Falha no processamento: ${message}`,
      error: message,
    });
    throw err;
  }
}

/** Grid mosaic of downscaled thumbnails — stand-in for orthomosaic output. */
async function createPreviewMosaic(
  imagePaths: string[],
  outPath: string,
): Promise<void> {
  const thumbHeight = 320;
  const maxCols = 4;
  const thumbs: { buffer: Buffer; width: number; height: number }[] = [];

  for (const imgPath of imagePaths.slice(0, 24)) {
    const meta = await sharp(imgPath)
      .rotate()
      .resize({ height: thumbHeight, fit: "inside" })
      .jpeg({ quality: 82 })
      .toBuffer({ resolveWithObject: true });

    thumbs.push({
      buffer: meta.data,
      width: meta.info.width,
      height: meta.info.height,
    });
  }

  if (thumbs.length === 0) {
    throw new Error("Não foi possível ler as imagens");
  }

  const cols = Math.min(maxCols, thumbs.length);
  const rows = Math.ceil(thumbs.length / cols);
  const cellWidth = Math.max(...thumbs.map((t) => t.width));
  const cellHeight = thumbHeight;
  const canvasWidth = cols * cellWidth;
  const canvasHeight = rows * cellHeight;

  const composites: sharp.OverlayOptions[] = thumbs.map((thumb, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * cellWidth + Math.floor((cellWidth - thumb.width) / 2);
    const y = row * cellHeight + Math.floor((cellHeight - thumb.height) / 2);
    return { input: thumb.buffer, left: x, top: y };
  });

  await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 3,
      background: { r: 13, g: 17, b: 24 },
    },
  })
    .composite(composites)
    .jpeg({ quality: 88 })
    .toFile(outPath);
}

async function createResultsZip(
  jobId: string,
  imagePaths: string[],
  previewPath: string,
  zipPath: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 6 } });

    output.on("close", () => resolve());
    archive.on("error", reject);
    output.on("error", reject);

    archive.pipe(output);
    archive.file(previewPath, { name: PREVIEW_NAME });
    archive.append(
      [
        "Datageo Ntrip — pacote MVP de processamento",
        `Job: ${jobId}`,
        `Imagens de entrada: ${imagePaths.length}`,
        "",
        "Em produção este ZIP conteria ortomosaico GeoTIFF, DSM, nuvem de pontos e relatório.",
      ].join("\n"),
      { name: "LEIA-ME.txt" },
    );

    for (const imgPath of imagePaths.slice(0, 12)) {
      const base = path.basename(imgPath);
      archive.file(imgPath, { name: `miniaturas/${base}` });
    }

    archive.finalize();
  });
}
