import "server-only";
import { readdir, readFile } from "fs/promises";
import path from "path";
import type { PhotogrammetryOutput, PipelineStepId } from "./types";

export const ODM_STATUS = {
  QUEUED: 10,
  RUNNING: 20,
  FAILED: 30,
  COMPLETED: 40,
  CANCELED: 50,
} as const;

export function getOdmBaseUrl(): string | null {
  const url = process.env.PHOTOGRAMMETRY_ODM_URL?.trim().replace(/\/$/, "");
  return url || null;
}

export function isOdmConfigured(): boolean {
  return Boolean(getOdmBaseUrl());
}

export interface OdmHealth {
  ok: boolean;
  version?: string;
  error?: string;
}

export async function checkOdmHealth(): Promise<OdmHealth> {
  const base = getOdmBaseUrl();
  if (!base) return { ok: false, error: "PHOTOGRAMMETRY_ODM_URL não configurada." };

  try {
    const res = await fetch(`${base}/info`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ok: false, error: `NodeODM respondeu HTTP ${res.status}.` };
    const data = (await res.json()) as { version?: string };
    return { ok: true, version: data.version ?? "NodeODM" };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "NodeODM indisponível.",
    };
  }
}

export interface OdmTaskInfo {
  uuid: string;
  progress: number;
  statusCode: number;
  errorMessage?: string;
  processingTime?: number;
  imagesCount?: number;
}

export async function getOdmTaskInfo(taskId: string): Promise<OdmTaskInfo> {
  const base = getOdmBaseUrl();
  if (!base) throw new Error("NodeODM não configurado.");

  const res = await fetch(`${base}/task/${taskId}/info`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Falha ao consultar tarefa ODM (${res.status}).`);
  const data = (await res.json()) as {
    uuid: string;
    progress?: number;
    status?: { code?: number; errorMessage?: string };
    processingTime?: number;
    imagesCount?: number;
  };

  return {
    uuid: data.uuid,
    progress: data.progress ?? 0,
    statusCode: data.status?.code ?? ODM_STATUS.QUEUED,
    errorMessage: data.status?.errorMessage,
    processingTime: data.processingTime,
    imagesCount: data.imagesCount,
  };
}

export async function getOdmTaskOutputs(taskId: string): Promise<string[]> {
  const base = getOdmBaseUrl();
  if (!base) return [];

  const res = await fetch(`${base}/task/${taskId}/output`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) return [];
  const data = (await res.json()) as string[] | { output?: string[] };
  if (Array.isArray(data)) return data;
  return data.output ?? [];
}

export async function listOdmTaskIds(): Promise<string[]> {
  const base = getOdmBaseUrl();
  if (!base) return [];
  const res = await fetch(`${base}/task/list`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{ uuid: string }>;
  return data.map((t) => t.uuid);
}

export async function cancelOdmTask(taskId: string): Promise<boolean> {
  const base = getOdmBaseUrl();
  if (!base) return false;
  try {
    const res = await fetch(`${base}/task/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uuid: taskId }),
      signal: AbortSignal.timeout(15000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Cancela tarefas antigas na fila para liberar o NodeODM (maxParallelTasks=1). */
export async function prepareOdmQueueForNewJob(): Promise<{ cancelled: number }> {
  const ids = await listOdmTaskIds();
  let cancelled = 0;
  for (const id of ids) {
    try {
      const info = await getOdmTaskInfo(id);
      if (info.statusCode === ODM_STATUS.QUEUED || info.statusCode === ODM_STATUS.RUNNING) {
        if (await cancelOdmTask(id)) cancelled += 1;
      }
    } catch {
      // ignore
    }
  }
  if (cancelled > 0) {
    await waitForOdmSlot(45000);
  }
  return { cancelled };
}

/** Aguarda até não haver tarefas RUNNING/QUEUED no NodeODM. */
export async function waitForOdmSlot(maxMs = 45000): Promise<void> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const ids = await listOdmTaskIds();
    let busy = false;
    for (const id of ids) {
      try {
        const info = await getOdmTaskInfo(id);
        if (info.statusCode === ODM_STATUS.QUEUED || info.statusCode === ODM_STATUS.RUNNING) {
          busy = true;
          break;
        }
      } catch {
        // ignore
      }
    }
    if (!busy) return;
    await new Promise((r) => setTimeout(r, 1500));
  }
}

export async function getOdmTaskQueuePosition(taskId: string): Promise<number> {
  const ids = await listOdmTaskIds();
  let ahead = 0;
  for (const id of ids) {
    if (id === taskId) break;
    try {
      const info = await getOdmTaskInfo(id);
      if (info.statusCode === ODM_STATUS.QUEUED || info.statusCode === ODM_STATUS.RUNNING) {
        ahead += 1;
      }
    } catch {
      // ignore
    }
  }
  return ahead;
}

export function mapOdmProgressToUi(
  statusCode: number,
  odmProgress: number,
  queueAhead = 0,
): number {
  if (statusCode === ODM_STATUS.QUEUED) {
    return Math.max(8, Math.min(14, 12 - queueAhead));
  }
  if (statusCode === ODM_STATUS.RUNNING) {
    return Math.min(99, Math.round(15 + odmProgress * 0.84));
  }
  return odmProgress;
}

const consoleLineCache = new Map<string, number>();

/** Busca só o final do log ODM (evita baixar centenas de MB a cada poll). */
export async function getOdmTaskConsoleTail(taskId: string): Promise<string> {
  const base = getOdmBaseUrl();
  if (!base) return "";
  const cachedLine = consoleLineCache.get(taskId) ?? 0;
  const fromLine = Math.max(0, cachedLine - 30);
  try {
    const res = await fetch(`${base}/task/${taskId}/output?line=${fromLine}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";
    const text = await res.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    consoleLineCache.set(taskId, fromLine + lines.length);
    return lines.slice(-60).join("\n");
  } catch {
    return "";
  }
}

export async function getOdmQueueSize(): Promise<number> {
  const base = getOdmBaseUrl();
  if (!base) return 0;
  try {
    const res = await fetch(`${base}/info`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return 0;
    const data = (await res.json()) as { taskQueueCount?: number };
    return data.taskQueueCount ?? 0;
  } catch {
    return 0;
  }
}

export type OdmTaskOption = { name: string; value: string | number | boolean };

export async function getOdmTaskConsole(taskId: string): Promise<string> {
  return getOdmTaskConsoleTail(taskId);
}

/** Extrai a última linha INFO/DEBUG relevante do console ODM. */
export function parseOdmStageLine(consoleText: string): string | null {
  const lines = consoleText.split(/\r?\n/).reverse();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^\[INFO\]\s+Running \w+ stage/.test(trimmed)) {
      return trimmed.replace(/^\[INFO\]\s+/, "");
    }
    const opensfm = trimmed.match(/opensfm" (\w+)/);
    if (opensfm) return `OpenSfM: ${opensfm[1]}`;
    if (/match_features|detect_features|reconstruct|create_tracks/.test(trimmed)) {
      const step = trimmed.match(/(match_features|detect_features|reconstruct\w*|create_tracks)/);
      if (step) return `OpenSfM: ${step[1]}`;
    }
    if (/^\[INFO\]\s+(?!={3,})/.test(trimmed) && !/^\[INFO\]\s+\d/.test(trimmed)) {
      const msg = trimmed.replace(/^\[INFO\]\s+/, "");
      if (msg.length > 8 && msg.length < 120) return msg;
    }
  }
  return null;
}

export async function createOdmTask(imageDir: string, options: OdmTaskOption[]): Promise<string> {
  const base = getOdmBaseUrl();
  if (!base) throw new Error("NodeODM não configurado.");

  await prepareOdmQueueForNewJob();

  const names = (await readdir(imageDir))
    .filter((n) => !n.startsWith(".") && /\.(jpe?g|png|tif{1,2})$/i.test(n));
  if (names.length < 2) throw new Error("Pelo menos 2 imagens são necessárias.");

  const form = new FormData();
  for (const name of names) {
    const buf = await readFile(path.join(imageDir, name));
    form.append("images", new Blob([buf]), name);
  }
  try {
    const gcpBuf = await readFile(path.join(imageDir, "gcp_list.txt"));
    form.append("images", new Blob([gcpBuf]), "gcp_list.txt");
  } catch {
    // GCP opcional
  }
  form.append("options", JSON.stringify(options));

  const token = process.env.PHOTOGRAMMETRY_ODM_TOKEN;
  const url = token ? `${base}/task/new?token=${encodeURIComponent(token)}` : `${base}/task/new`;

  const res = await fetch(url, { method: "POST", body: form, signal: AbortSignal.timeout(600_000) });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`NodeODM recusou a tarefa (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as { uuid?: string; error?: string };
  if (!data.uuid) throw new Error(data.error ?? "NodeODM não retornou UUID da tarefa.");
  return data.uuid;
}

const OUTPUT_LABELS: Record<string, string> = {
  "odm_report.pdf": "Relatório ODM",
  "all.zip": "Pacote completo (ZIP)",
  "orthophoto.tif": "Ortofoto",
  "odm_orthophoto.tif": "Ortofoto",
  "odm_orthophoto.png": "Ortofoto (PNG)",
  "dsm.tif": "MDS (DSM)",
  "dtm.tif": "MDT (DTM)",
  "georeferenced_model.laz": "Nuvem densa (LAZ)",
  "odm_georeferencing_model.laz": "Nuvem densa (LAZ)",
  "shots.geojson": "Poses das câmeras",
  "cameras.json": "Câmeras",
  "textured_model.zip": "Modelo 3D texturizado",
};

function mimeForFile(name: string): string {
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".tif") || name.endsWith(".tiff")) return "image/tiff";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".zip")) return "application/zip";
  if (name.endsWith(".laz") || name.endsWith(".las")) return "application/octet-stream";
  if (name.endsWith(".json") || name.endsWith(".geojson")) return "application/json";
  return "application/octet-stream";
}

const STEP_PREFERRED: Record<PipelineStepId, RegExp[]> = {
  align: [/shots\.geojson/i, /cameras\.json/i, /tracks\.csv/i, /report\.pdf/i, /all\.zip/i],
  dense: [/\.laz$/i, /textured_model/i, /report\.pdf/i],
  dem: [/dsm\.tif/i, /dtm\.tif/i, /report\.pdf/i],
  orthophoto: [/orthophoto/i, /all\.zip/i, /report\.pdf/i],
};

export function mapOdmOutputs(
  stepId: PipelineStepId,
  projectId: string,
  jobId: string,
  files: string[],
): PhotogrammetryOutput[] {
  const preferred = STEP_PREFERRED[stepId];
  const sorted = [...files].sort((a, b) => {
    const ai = preferred.findIndex((re) => re.test(a));
    const bi = preferred.findIndex((re) => re.test(b));
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return sorted.slice(0, 8).map((filePath, i) => {
    const fileName = filePath.split("/").pop() ?? filePath;
    return {
      id: `${projectId}_${stepId}_odm_${i}`,
      stepId,
      label: OUTPUT_LABELS[fileName] ?? fileName,
      fileName: filePath,
      mimeType: mimeForFile(fileName),
      downloadPath: `/api/photogrammetry/jobs/${jobId}/download/${encodeURIComponent(filePath)}`,
    };
  });
}

export function odmDownloadUrl(taskId: string, assetPath: string): string | null {
  const base = getOdmBaseUrl();
  if (!base) return null;
  const token = process.env.PHOTOGRAMMETRY_ODM_TOKEN;
  const asset = encodeURIComponent(assetPath);
  return token
    ? `${base}/task/${taskId}/download/${asset}?token=${encodeURIComponent(token)}`
    : `${base}/task/${taskId}/download/${asset}`;
}
