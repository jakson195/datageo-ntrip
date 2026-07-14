import "server-only";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { demoDurationMs, demoOutputs, odmOptionsForStep } from "./odm-options";
import {
  ODM_STATUS,
  checkOdmHealth,
  createOdmTask,
  getOdmTaskConsole,
  getOdmTaskInfo,
  getOdmTaskOutputs,
  getOdmTaskQueuePosition,
  isOdmConfigured,
  mapOdmOutputs,
  mapOdmProgressToUi,
  parseOdmStageLine,
} from "./nodeodm-client";
import { getJob, saveJob, updateJob } from "./job-store";
import type { PhotogrammetryJob, PhotogrammetrySettings, PipelineStepId } from "./types";

function newJobId() {
  return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function uploadsRoot() {
  return path.join(process.cwd(), "uploads", "photogrammetry");
}

async function saveUploadedImages(jobId: string, files: File[]) {
  const dir = path.join(uploadsRoot(), jobId);
  await mkdir(dir, { recursive: true });
  for (const file of files) {
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, file.name), buf);
  }
  return dir;
}

function odmStatusMessage(
  code: number,
  uiProgress: number,
  odmProgress: number,
  queueAhead = 0,
  stageLine?: string | null,
  stallMinutes = 0,
  photoCount = 0,
): string {
  if (code === ODM_STATUS.QUEUED) {
    return queueAhead > 0
      ? `Na fila do NodeODM (${queueAhead} tarefa(s) à frente) — aguardando…`
      : "Iniciando no NodeODM…";
  }
  if (code === ODM_STATUS.RUNNING) {
    const stage = stageLine ? ` · ${stageLine}` : "";
    const stall =
      stallMinutes >= 2
        ? ` · etapa lenta (${stallMinutes} min, ${photoCount} fotos — OpenSfM pode demorar)`
        : stallMinutes >= 1
          ? ` · processando (${stallMinutes} min)…`
          : "";
    return `OpenDroneMap ${uiProgress}% (motor ${odmProgress.toFixed(1)}%)${stage}${stall}`;
  }
  if (code === ODM_STATUS.COMPLETED) return "Concluído no NodeODM.";
  if (code === ODM_STATUS.FAILED) return "Falha no NodeODM.";
  return "Aguardando NodeODM…";
}

export async function refreshPhotogrammetryJob(jobId: string): Promise<PhotogrammetryJob | undefined> {
  const job = await getJob(jobId);
  if (!job || job.status !== "processing") return job;

  if (job.mode === "odm" && job.odmTaskId) {
    try {
      const info = await getOdmTaskInfo(job.odmTaskId);
      const statusCode = info.statusCode;

      if (statusCode === ODM_STATUS.FAILED || statusCode === ODM_STATUS.CANCELED) {
        const err = info.errorMessage?.trim() || "Processamento ODM falhou.";
        return updateJob(jobId, {
          status: "failed",
          progress: info.progress,
          message: err,
          error: err,
        });
      }

      if (statusCode === ODM_STATUS.COMPLETED) {
        const files = await getOdmTaskOutputs(job.odmTaskId);
        const outputs = mapOdmOutputs(job.stepId, job.projectId, jobId, files);
        return updateJob(jobId, {
          status: "completed",
          progress: 100,
          message: outputs.length
            ? "Concluído no OpenDroneMap."
            : "Concluído, mas nenhum produto listado — verifique o NodeODM.",
          outputs,
        });
      }

      const queueAhead = await getOdmTaskQueuePosition(job.odmTaskId);
      let uiProgress = mapOdmProgressToUi(statusCode, info.progress, queueAhead);

      const progressUnchanged =
        job.lastOdmProgress != null && Math.abs(job.lastOdmProgress - info.progress) < 0.01;
      const stallSince = progressUnchanged ? (job.odmStallSince ?? job.updatedAt) : new Date().toISOString();
      const stallMinutes = Math.floor((Date.now() - new Date(stallSince).getTime()) / 60_000);
      if (stallMinutes >= 1 && progressUnchanged) {
        uiProgress = Math.min(99, uiProgress + Math.min(5, stallMinutes));
      }

      const shouldFetchConsole =
        !job.lastConsoleFetch ||
        Date.now() - new Date(job.lastConsoleFetch).getTime() > 12_000;
      let stageLine: string | null = null;
      if (shouldFetchConsole && statusCode === ODM_STATUS.RUNNING) {
        const consoleText = await getOdmTaskConsole(job.odmTaskId);
        stageLine = parseOdmStageLine(consoleText);
      }

      return updateJob(jobId, {
        progress: Math.max(job.progress, uiProgress),
        message: odmStatusMessage(
          statusCode,
          uiProgress,
          info.progress,
          queueAhead,
          stageLine,
          stallMinutes,
          job.photoCount ?? 0,
        ),
        lastOdmProgress: info.progress,
        odmStallSince: stallSince,
        ...(shouldFetchConsole ? { lastConsoleFetch: new Date().toISOString() } : {}),
      });
    } catch (err) {
      return updateJob(jobId, {
        status: "failed",
        error: err instanceof Error ? err.message : "Erro ao consultar NodeODM.",
      });
    }
  }

  if (job.mode === "demo" && job.demoStartedAt) {
    const elapsed = Date.now() - new Date(job.demoStartedAt).getTime();
    const totalMs = demoDurationMs(job.stepId, job.photoCount ?? 10);
    const progress = Math.min(99, Math.round((elapsed / totalMs) * 100));
    const messages = [
      "Carregando fotos…",
      "Detecção de keypoints…",
      "Correspondência entre imagens…",
      "Estimativa de poses…",
      "Otimização de bundle…",
      "Gerando produtos…",
    ];
    const msgIndex = Math.min(messages.length - 1, Math.floor((progress / 100) * messages.length));

    if (elapsed >= totalMs) {
      const outputs = demoOutputs(job.stepId, job.projectId).map((o) => ({
        ...o,
        downloadPath: `/api/photogrammetry/jobs/${jobId}/download/${encodeURIComponent(o.fileName)}`,
      }));
      return updateJob(jobId, {
        status: "completed",
        progress: 100,
        message: "Concluído (demonstração).",
        outputs,
      });
    }

    return updateJob(jobId, {
      progress,
      message: `${messages[msgIndex]} (demonstração)`,
    });
  }

  return job;
}

async function startOdmJob(
  jobId: string,
  stepId: PipelineStepId,
  settings: PhotogrammetrySettings,
  imageDir: string,
  gcpListText?: string | null,
): Promise<boolean> {
  if (!isOdmConfigured()) return false;

  const health = await checkOdmHealth();
  if (!health.ok) return false;

  await updateJob(jobId, { message: "Enviando imagens ao NodeODM…", progress: 5, mode: "odm" });

  if (gcpListText) {
    await writeFile(path.join(imageDir, "gcp_list.txt"), gcpListText, "utf8");
  }

  await updateJob(jobId, { message: "Enviando imagens ao NodeODM (pode levar vários minutos)…", progress: 8, mode: "odm" });

  const options = odmOptionsForStep(stepId, settings);
  const odmTaskId = await createOdmTask(imageDir, options);

  await updateJob(jobId, {
    odmTaskId,
    mode: "odm",
    message: gcpListText
      ? `Tarefa ODM ${odmTaskId.slice(0, 8)}… — com GCP (${stepId}).`
      : `Tarefa ODM ${odmTaskId.slice(0, 8)}… — alinhamento iniciado (pode levar vários minutos).`,
    progress: 12,
  });
  return true;
}

export async function startPhotogrammetryJob(input: {
  userId: string;
  projectId: string;
  stepId: PipelineStepId;
  settings: PhotogrammetrySettings;
  files: File[];
  gcpListText?: string | null;
}): Promise<PhotogrammetryJob> {
  const jobId = newJobId();
  const odmConfigured = isOdmConfigured();
  const job: PhotogrammetryJob = {
    id: jobId,
    userId: input.userId,
    projectId: input.projectId,
    stepId: input.stepId,
    status: "queued",
    progress: 0,
    message: "Na fila…",
    mode: odmConfigured ? "odm" : "demo",
    outputs: [],
    photoCount: input.files.length,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveJob(job);

  if (input.files.length < 2) {
    await updateJob(jobId, {
      status: "failed",
      error: "São necessárias pelo menos 2 fotos. Reimporte as imagens e tente novamente.",
      progress: 0,
    });
    return (await getJob(jobId))!;
  }

  await updateJob(jobId, { status: "processing", message: "Salvando imagens…", progress: 2 });
  const imageDir = await saveUploadedImages(jobId, input.files);

  try {
    const usedOdm = await startOdmJob(jobId, input.stepId, input.settings, imageDir, input.gcpListText);
    if (!usedOdm) {
      await updateJob(jobId, {
        mode: "demo",
        demoStartedAt: new Date().toISOString(),
        message:
          input.stepId === "align"
            ? "Alinhando fotos (modo demonstração — NodeODM offline)…"
            : `Processando ${input.stepId} (demonstração)…`,
      });
    }
  } catch (err) {
    await updateJob(jobId, {
      status: "failed",
      mode: "odm",
      error: err instanceof Error ? err.message : "Falha ao iniciar NodeODM.",
    });
  }

  return (await getJob(jobId))!;
}

export { checkOdmHealth, isOdmConfigured };
