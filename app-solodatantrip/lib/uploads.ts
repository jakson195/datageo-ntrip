import fs from "fs/promises";
import path from "path";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

export function getUploadsRoot(): string {
  return UPLOADS_ROOT;
}

export function getJobDir(jobId: string): string {
  return path.join(UPLOADS_ROOT, jobId);
}

export function getInputDir(jobId: string): string {
  return path.join(getJobDir(jobId), "input");
}

export function getOutputDir(jobId: string): string {
  return path.join(getJobDir(jobId), "output");
}

export function getJobMetaPath(jobId: string): string {
  return path.join(getJobDir(jobId), "job.json");
}

/** Strip path segments and unsafe characters from filenames. */
export function sanitizeFilename(name: string): string {
  const base = path.basename(name);
  const cleaned = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._]+/, "")
    .slice(0, 200);

  return cleaned || "arquivo";
}

export function getExtension(filename: string): string {
  const ext = path.extname(filename).slice(1).toLowerCase();
  return ext === "jpeg" ? "jpg" : ext;
}

export async function ensureJobDirs(jobId: string): Promise<void> {
  await fs.mkdir(getInputDir(jobId), { recursive: true });
  await fs.mkdir(getOutputDir(jobId), { recursive: true });
}

export function isValidJobId(jobId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    jobId,
  );
}
