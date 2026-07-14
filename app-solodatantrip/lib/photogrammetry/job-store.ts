import "server-only";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { PhotogrammetryJob } from "./types";

const jobs = new Map<string, PhotogrammetryJob>();

function jobsDir() {
  return path.join(process.cwd(), "uploads", "photogrammetry", "jobs");
}

async function persistJob(job: PhotogrammetryJob) {
  try {
    const dir = jobsDir();
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${job.id}.json`), JSON.stringify(job), "utf8");
  } catch {
    // disco opcional em dev
  }
}

async function loadJobFromDisk(id: string): Promise<PhotogrammetryJob | undefined> {
  try {
    const raw = await readFile(path.join(jobsDir(), `${id}.json`), "utf8");
    return JSON.parse(raw) as PhotogrammetryJob;
  } catch {
    return undefined;
  }
}

export function saveJob(job: PhotogrammetryJob) {
  jobs.set(job.id, job);
  void persistJob(job);
}

export async function getJob(id: string): Promise<PhotogrammetryJob | undefined> {
  const cached = jobs.get(id);
  if (cached) return cached;
  const fromDisk = await loadJobFromDisk(id);
  if (fromDisk) jobs.set(id, fromDisk);
  return fromDisk;
}

export async function updateJob(
  id: string,
  patch: Partial<PhotogrammetryJob>,
): Promise<PhotogrammetryJob | undefined> {
  const current = jobs.get(id) ?? (await loadJobFromDisk(id));
  if (!current) return undefined;
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  jobs.set(id, next);
  await persistJob(next);
  return next;
}

export function listJobsForUser(userId: string): PhotogrammetryJob[] {
  return [...jobs.values()].filter((j) => j.userId === userId);
}
