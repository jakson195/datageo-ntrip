import fs from "fs/promises";
import path from "path";
import {
  getInputDir,
  getJobMetaPath,
  getOutputDir,
  isValidJobId,
} from "./uploads";

export type JobStatus =
  | "uploaded"
  | "processing"
  | "ready"
  | "error";

export interface JobDownload {
  name: string;
  url: string;
  label: string;
}

export interface JobRecord {
  id: string;
  projectName: string | null;
  status: JobStatus;
  progress: number;
  message: string;
  fileCount: number;
  createdAt: string;
  updatedAt: string;
  downloads: JobDownload[];
  error: string | null;
}

export function createEmptyJob(
  id: string,
  projectName: string | null,
  fileCount: number,
): JobRecord {
  const now = new Date().toISOString();
  return {
    id,
    projectName,
    status: "uploaded",
    progress: 0,
    message: "Imagens recebidas. Aguardando processamento.",
    fileCount,
    createdAt: now,
    updatedAt: now,
    downloads: [],
    error: null,
  };
}

export async function readJob(jobId: string): Promise<JobRecord | null> {
  if (!isValidJobId(jobId)) return null;
  try {
    const raw = await fs.readFile(getJobMetaPath(jobId), "utf-8");
    return JSON.parse(raw) as JobRecord;
  } catch {
    return null;
  }
}

export async function writeJob(job: JobRecord): Promise<void> {
  job.updatedAt = new Date().toISOString();
  await fs.writeFile(getJobMetaPath(job.id), JSON.stringify(job, null, 2));
}

export async function updateJob(
  jobId: string,
  patch: Partial<
    Pick<JobRecord, "status" | "progress" | "message" | "downloads" | "error">
  >,
): Promise<JobRecord | null> {
  const job = await readJob(jobId);
  if (!job) return null;
  Object.assign(job, patch);
  await writeJob(job);
  return job;
}

export function buildDownloadUrl(jobId: string, filename: string): string {
  return `/api/jobs/${jobId}/download/${encodeURIComponent(filename)}`;
}

export async function listInputImages(jobId: string): Promise<string[]> {
  const dir = getInputDir(jobId);
  const entries = await fs.readdir(dir);
  return entries
    .filter((f) => !f.startsWith("."))
    .map((f) => path.join(dir, f))
    .sort();
}

export async function listOutputFiles(jobId: string): Promise<string[]> {
  const dir = getOutputDir(jobId);
  try {
    const entries = await fs.readdir(dir);
    return entries.filter((f) => !f.startsWith("."));
  } catch {
    return [];
  }
}
