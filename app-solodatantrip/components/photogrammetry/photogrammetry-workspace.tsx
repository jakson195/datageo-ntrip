"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { PhotoMap } from "./photo-map";
import { applyManualGcpMark, GcpPanel } from "./gcp-panel";
import {
  buildGcpListText,
  DEFAULT_SETTINGS,
  PHOTOGRAMMETRY_STORAGE_KEY,
  PIPELINE_STEPS,
  denseStepSkipped,
  newProject,
  nextPipelineStep,
  parsePhotoFiles,
  pipelineStepsFor,
  type PhotogrammetryProject,
  type PhotogrammetrySettings,
  type PhotoAsset,
  type PipelineStepId,
  type StepStatus,
} from "@/lib/photogrammetry";

type ViewMode = "map" | "photos" | "outputs" | "log";

const STEP_LABELS: Record<PipelineStepId, string> = {
  align: "Alinhar fotos",
  dense: "Nuvem densa",
  dem: "DEM / MDS / MDT",
  orthophoto: "Ortofoto",
};

function stepIcon(status: StepStatus) {
  if (status === "done") return "✓";
  if (status === "skipped") return "—";
  if (status === "running") return "◔";
  if (status === "error") return "!";
  if (status === "ready") return "○";
  return "·";
}

export function PhotogrammetryWorkspace() {
  const t = useTranslations("photogrammetry");
  const fileRef = useRef<HTMLInputElement>(null);
  const fileMapRef = useRef<Map<string, File>>(new Map());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRunRef = useRef(false);

  const [project, setProject] = useState<PhotogrammetryProject>(() => newProject());
  const [view, setView] = useState<ViewMode>("photos");
  const [activeStep, setActiveStep] = useState<PipelineStepId | "import">("import");
  const [importing, setImporting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rejectMsg, setRejectMsg] = useState<string | null>(null);
  const [selectedGcpId, setSelectedGcpId] = useState<string | null>(null);
  const [odmStatus, setOdmStatus] = useState<{
    configured: boolean;
    available: boolean;
    version?: string;
    message: string;
  } | null>(null);

  const persist = useCallback((next: PhotogrammetryProject) => {
    const { photos, ...rest } = next;
    const serializable = {
      ...rest,
      photos: photos.map(({ thumbUrl, ...p }) => p),
    };
    sessionStorage.setItem(PHOTOGRAMMETRY_STORAGE_KEY, JSON.stringify(serializable));
  }, []);

  const patchProject = useCallback(
    (patch: Partial<PhotogrammetryProject> | ((p: PhotogrammetryProject) => PhotogrammetryProject)) => {
      setProject((prev) => {
        const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch, updatedAt: new Date().toISOString() };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PHOTOGRAMMETRY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PhotogrammetryProject;
        setProject({
          ...newProject(parsed.name),
          ...parsed,
          photos: parsed.photos ?? [],
          gcps: parsed.gcps ?? [],
          settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
        });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void fetch("/api/photogrammetry/odm-status")
      .then((r) => r.json())
      .then((data: { configured: boolean; available: boolean; version?: string; message: string }) =>
        setOdmStatus(data),
      )
      .catch(() =>
        setOdmStatus({
          configured: false,
          available: false,
          message: "Não foi possível verificar o NodeODM.",
        }),
      );
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    setImporting(true);
    setRejectMsg(null);
    try {
      const { accepted, rejected } = await parsePhotoFiles(Array.from(list));
      for (const f of Array.from(list)) {
        const asset = accepted.find((a) => a.fileName === f.name);
        if (asset) fileMapRef.current.set(asset.id, f);
      }
      patchProject((prev) => {
        const steps = { ...prev.steps };
        if (accepted.length >= 2) {
          steps.align = { ...steps.align, status: "ready" };
        }
        return {
          ...prev,
          photos: [...prev.photos, ...accepted],
          steps,
          logs: [
            ...prev.logs,
            `[${new Date().toLocaleTimeString()}] ${accepted.length} foto(s) importada(s).`,
            ...(rejected.length ? [`Arquivos rejeitados: ${rejected.join(", ")}`] : []),
          ],
        };
      });
      if (rejected.length) setRejectMsg(t("import.rejected", { count: rejected.length }));
      setView("photos");
      setActiveStep("import");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function pollJob(jobId: string, stepId: PipelineStepId) {
    if (pollRef.current) clearInterval(pollRef.current);

    const tick = async () => {
      try {
        const res = await fetch(`/api/photogrammetry/jobs/${jobId}`);
        const data = (await res.json()) as {
          job?: {
            status: string;
            progress: number;
            message: string;
            outputs: PhotogrammetryProject["outputs"];
            error?: string;
            mode: string;
          };
          error?: string;
        };
        const job = data.job;
        if (!job) return;

        const stepMessage = job.error ?? job.message;

        patchProject((prev) => ({
          ...prev,
          steps: {
            ...prev.steps,
            [stepId]: {
              ...prev.steps[stepId],
              status: job.status === "completed" ? "done" : job.status === "failed" ? "error" : "running",
              progress: job.progress,
              message: stepMessage,
              jobId,
            },
          },
          outputs: job.status === "completed" ? [...prev.outputs.filter((o) => o.stepId !== stepId), ...job.outputs] : prev.outputs,
          logs: [
            ...prev.logs,
            ...(job.status === "completed" || job.status === "failed"
              ? [`[${new Date().toLocaleTimeString()}] ${STEP_LABELS[stepId]}: ${job.status === "completed" ? "concluído" : stepMessage ?? "falhou"} (${job.mode})`]
              : []),
          ],
        }));

        if (job.status === "completed" || job.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          setProcessing(false);
          if (job.status === "completed") {
            let nextStep: PipelineStepId | undefined;
            patchProject((prev) => {
              const stepUpdates: Partial<Record<PipelineStepId, PhotogrammetryProject["steps"][PipelineStepId]>> = {};
              if (stepId === "align" && denseStepSkipped(prev.settings)) {
                stepUpdates.dense = {
                  ...prev.steps.dense,
                  status: "skipped",
                  progress: 0,
                  message: t("settings.denseSkipped"),
                };
              }
              nextStep = nextPipelineStep(stepId, prev.settings);
              if (nextStep) {
                stepUpdates[nextStep] = { ...prev.steps[nextStep], status: "ready" };
              }
              return {
                ...prev,
                steps: { ...prev.steps, ...stepUpdates },
              };
            });
            if (autoRunRef.current && nextStep) {
              setTimeout(() => void runStep(nextStep!), 600);
            } else if (!nextStep) {
              autoRunRef.current = false;
            }
            setView("outputs");
          } else {
            autoRunRef.current = false;
          }
        }
      } catch {
        if (pollRef.current) clearInterval(pollRef.current);
        setProcessing(false);
      }
    };

    void tick();
    pollRef.current = setInterval(() => void tick(), 2000);
  }

  function submitJobWithProgress(
    form: FormData,
    onProgress: (progress: number, message: string) => void,
  ): Promise<{ job?: { id: string; progress?: number; message?: string; status?: string }; error?: string }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/photogrammetry/jobs");
      xhr.timeout = 600_000;

      xhr.upload.addEventListener("progress", (e) => {
        if (!e.lengthComputable || e.total <= 0) return;
        const pct = Math.max(1, Math.min(14, Math.round((e.loaded / e.total) * 14)));
        onProgress(pct, t("processing.uploadingPhotos", { pct }));
      });

      xhr.upload.addEventListener("load", () => {
        onProgress(15, t("processing.serverProcessing"));
      });

      xhr.addEventListener("load", () => {
        try {
          const data = JSON.parse(xhr.responseText) as {
            job?: { id: string; progress?: number; message?: string; status?: string };
            error?: string;
          };
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            reject(new Error(data.error ?? t("processing.failed")));
          }
        } catch {
          reject(new Error(t("processing.failed")));
        }
      });

      xhr.addEventListener("error", () => reject(new Error(t("processing.networkError"))));
      xhr.addEventListener("timeout", () => reject(new Error(t("processing.timeout"))));

      xhr.send(form);
    });
  }

  async function clearOdmQueue() {
    try {
      const res = await fetch("/api/photogrammetry/odm-clear-queue", { method: "POST" });
      const data = (await res.json()) as { message?: string };
      patchProject((prev) => ({
        ...prev,
        logs: [...prev.logs, `[${new Date().toLocaleTimeString()}] ${data.message ?? "Fila ODM limpa."}`],
      }));
      void fetch("/api/photogrammetry/odm-status")
        .then((r) => r.json())
        .then((s) => setOdmStatus(s));
    } catch {
      setRejectMsg(t("processing.clearQueueFailed"));
    }
  }

  function stepBlockedReason(stepId: PipelineStepId, p: PhotogrammetryProject): string | null {
    if (p.steps.align.status !== "done" && stepId !== "align") {
      return t("processing.needAlign");
    }
    if (stepId === "dense" && denseStepSkipped(p.settings)) {
      return t("processing.denseDisabled");
    }
    if (stepId === "dem") {
      const denseOk =
        !p.settings.generateDenseCloud ||
        p.steps.dense.status === "done" ||
        p.steps.dense.status === "skipped";
      if (!denseOk) return t("processing.needDense");
    }
    if (stepId === "orthophoto" && p.steps.dem.status !== "done") {
      return t("processing.needDem");
    }
    return null;
  }

  function applyDenseCloudPreference(enabled: boolean) {
    patchProject((prev) => {
      const steps = { ...prev.steps };
      if (!enabled && prev.steps.align.status === "done" && steps.dense.status !== "done") {
        steps.dense = { ...steps.dense, status: "skipped", message: t("settings.denseSkipped") };
        if (steps.dem.status === "idle") {
          steps.dem = { ...steps.dem, status: "ready" };
        }
      } else if (enabled && steps.dense.status === "skipped") {
        steps.dense = { ...steps.dense, status: "ready", message: undefined };
      }
      return {
        ...prev,
        settings: { ...prev.settings, generateDenseCloud: enabled },
        steps,
        logs: [
          ...prev.logs,
          `[${new Date().toLocaleTimeString()}] ${
            enabled ? t("settings.denseEnabledLog") : t("settings.denseSkippedLog")
          }`,
        ],
      };
    });
  }

  function skipDenseAndGoToDem() {
    applyDenseCloudPreference(false);
    setActiveStep("dem");
  }

  function handlePhotoMarkClick(
    e: MouseEvent<HTMLDivElement>,
    photo: PhotoAsset,
  ) {
    if (!selectedGcpId) return;
    const img = e.currentTarget.querySelector("img");
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const imgW = photo.width ?? img.naturalWidth ?? rect.width;
    const imgH = photo.height ?? img.naturalHeight ?? rect.height;
    const scaleX = imgW / rect.width;
    const scaleY = imgH / rect.height;
    const pixelX = (e.clientX - rect.left) * scaleX;
    const pixelY = (e.clientY - rect.top) * scaleY;
    patchProject((prev) => ({
      ...prev,
      gcps: applyManualGcpMark(prev, selectedGcpId, photo.id, photo.fileName, pixelX, pixelY),
    }));
  }

  async function runStep(stepId: PipelineStepId) {
    if (project.photos.length < 2 || processing) return;

    const blocked = stepBlockedReason(stepId, project);
    if (blocked) {
      setRejectMsg(blocked);
      return;
    }

    const filesToSend: File[] = [];
    for (const photo of project.photos) {
      const file = fileMapRef.current.get(photo.id);
      if (file) filesToSend.push(file);
    }

    if (filesToSend.length < 2) {
      setRejectMsg(t("import.needReimport"));
      patchProject((prev) => ({
        ...prev,
        logs: [...prev.logs, `[${new Date().toLocaleTimeString()}] ${t("import.needReimport")}`],
      }));
      return;
    }

    if (project.settings.useGcp) {
      const gcpList = buildGcpListText(project.gcps, project.settings.gcpProjection);
      if (!gcpList) {
        setRejectMsg(t("gcp.needObservations"));
        return;
      }
    }

    setProcessing(true);
    setActiveStep(stepId);
    setRejectMsg(null);
    patchProject((prev) => ({
      ...prev,
      steps: {
        ...prev.steps,
        [stepId]: { ...prev.steps[stepId], status: "running", progress: 1, message: t("processing.preparing") },
      },
      logs: [...prev.logs, `[${new Date().toLocaleTimeString()}] Iniciando ${STEP_LABELS[stepId]}…`],
    }));

    const form = new FormData();
    form.set("projectId", project.id);
    form.set("stepId", stepId);
    form.set("settings", JSON.stringify(project.settings));
    const gcpList = project.settings.useGcp
      ? buildGcpListText(project.gcps, project.settings.gcpProjection)
      : null;
    if (gcpList) form.set("gcpList", gcpList);
    for (const file of filesToSend) {
      form.append("images", file, file.name);
    }

    try {
      const data = await submitJobWithProgress(form, (progress, message) => {
        patchProject((prev) => ({
          ...prev,
          steps: {
            ...prev.steps,
            [stepId]: { ...prev.steps[stepId], status: "running", progress, message },
          },
        }));
      });
      if (!data.job) {
        throw new Error(data.error ?? t("processing.failed"));
      }
      const job = data.job;
      patchProject((prev) => ({
        ...prev,
        steps: {
          ...prev.steps,
          [stepId]: {
            ...prev.steps[stepId],
            status: "running",
            progress: job.progress ?? 12,
            message: job.message ?? t("processing.starting"),
            jobId: job.id,
          },
        },
      }));
      pollJob(job.id, stepId);
    } catch (err) {
      setProcessing(false);
      patchProject((prev) => ({
        ...prev,
        steps: {
          ...prev.steps,
          [stepId]: { ...prev.steps[stepId], status: "error", message: err instanceof Error ? err.message : t("processing.failed") },
        },
      }));
    }
  }

  async function runFullPipeline() {
    autoRunRef.current = true;
    const steps = pipelineStepsFor(project.settings);
    for (const stepId of steps) {
      const status = project.steps[stepId].status;
      if (status !== "done" && status !== "skipped") {
        await runStep(stepId);
        return;
      }
    }
    autoRunRef.current = false;
  }

  function updateSettings(patch: Partial<PhotogrammetrySettings>) {
    if ("generateDenseCloud" in patch && patch.generateDenseCloud !== undefined) {
      applyDenseCloudPreference(patch.generateDenseCloud);
      const { generateDenseCloud: _, ...rest } = patch;
      if (Object.keys(rest).length) {
        patchProject((prev) => ({ ...prev, settings: { ...prev.settings, ...rest } }));
      }
      return;
    }
    patchProject((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }

  function resetProject() {
    fileMapRef.current.clear();
    const fresh = newProject();
    setProject(fresh);
    sessionStorage.removeItem(PHOTOGRAMMETRY_STORAGE_KEY);
    setActiveStep("import");
    setView("photos");
  }

  const gpsCount = project.photos.filter((p) => p.hasGps).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-[#e5e7eb] bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <input
            value={project.name}
            onChange={(e) => patchProject({ name: e.target.value })}
            className="text-lg font-semibold text-[#0f2848] outline-none"
          />
          <p className="text-xs text-[#6b7280]">
            {t("summary.photos", { count: project.photos.length })}
            {gpsCount > 0 ? ` · ${t("summary.gps", { count: gpsCount })}` : ` · ${t("summary.noGps")}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".jpg,.jpeg,.png,.tif,.tiff,image/jpeg,image/png,image/tiff"
            multiple
            className="hidden"
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="rounded-lg bg-[#00c8f0] px-4 py-2 text-sm font-semibold text-[#0f2848] disabled:opacity-50"
          >
            {importing ? t("import.loading") : t("import.addPhotos")}
          </button>
          <button
            type="button"
            onClick={() => void runFullPipeline()}
            disabled={processing || project.photos.length < 2}
            className="rounded-lg bg-[#0f2848] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {processing ? t("processing.running") : t("processing.runAll")}
          </button>
          <button type="button" onClick={resetProject} className="rounded-lg border border-[#d1d5db] px-3 py-2 text-sm">
            {t("actions.newProject")}
          </button>
        </div>
      </div>

      {rejectMsg ? <p className="text-sm text-amber-700">{rejectMsg}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[220px_1fr_280px]">
        <aside className="rounded-xl border border-[#e5e7eb] bg-white p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">{t("pipeline.title")}</h3>
          <ol className="mt-3 space-y-1">
            <li>
              <button
                type="button"
                onClick={() => setActiveStep("import")}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${activeStep === "import" ? "bg-[#0f2848] text-white" : "hover:bg-[#f3f4f6]"}`}
              >
                <span>{project.photos.length > 0 ? "✓" : "1"}</span>
                {t("pipeline.import")}
              </button>
            </li>
            {PIPELINE_STEPS.map((stepId, i) => {
              const step = project.steps[stepId];
              return (
                <li key={stepId}>
                  <button
                    type="button"
                    onClick={() => setActiveStep(stepId)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                      activeStep === stepId ? "bg-[#0f2848] text-white" : "hover:bg-[#f3f4f6]"
                    } ${step.status === "skipped" ? "opacity-60" : ""}`}
                  >
                    <span>{stepIcon(step.status)}</span>
                    <span className="flex-1">{i + 2}. {STEP_LABELS[stepId]}</span>
                    {step.status === "running" ? (
                      <span className="text-xs opacity-80">{step.progress}%</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-[10px] leading-relaxed text-[#9ca3af]">
            {project.settings.generateDenseCloud ? t("pipeline.hint") : t("pipeline.hintSkipDense")}
          </p>
        </aside>

        <section className="rounded-xl border border-[#1e293b] bg-[#0b1220]">
          <div className="flex flex-wrap gap-1 border-b border-[#1e293b] p-2">
            {(["photos", "map", "outputs", "log"] as ViewMode[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${view === id ? "bg-[#00c8f0] text-[#0f2848]" : "text-[#94a3b8] hover:bg-[#1e293b]"}`}
              >
                {t(`views.${id}`)}
              </button>
            ))}
          </div>

          <div className="p-3">
            {view === "map" ? <PhotoMap photos={project.photos} /> : null}
            {view === "photos" ? (
              project.photos.length === 0 ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center text-center text-sm text-[#94a3b8]">
                  <p>{t("import.empty")}</p>
                  <button type="button" onClick={() => fileRef.current?.click()} className="mt-3 text-[#00c8f0] underline">
                    {t("import.addPhotos")}
                  </button>
                </div>
              ) : (
                <div className="grid max-h-[480px] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
                  {project.photos.map((p) => {
                    const marks = project.gcps.flatMap((g) =>
                      g.observations
                        .filter((o) => o.photoId === p.id)
                        .map((o) => ({ ...o, gcpName: g.name })),
                    );
                    const imgW = p.width ?? 1;
                    const imgH = p.height ?? 1;
                    return (
                      <div
                        key={p.id}
                        className={`overflow-hidden rounded-lg border bg-[#0f172a] ${
                          selectedGcpId ? "cursor-crosshair border-[#00c8f0]" : "border-[#334155]"
                        }`}
                        onClick={(e) => handlePhotoMarkClick(e, p)}
                      >
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.thumbUrl} alt={p.fileName} className="h-24 w-full object-cover" />
                          {marks.map((m) => (
                            <span
                              key={`${m.gcpName}-${m.photoId}`}
                              title={m.gcpName}
                              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-sm font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                              style={{
                                left: `${(m.pixelX / imgW) * 100}%`,
                                top: `${(m.pixelY / imgH) * 100}%`,
                              }}
                            >
                              ✕
                            </span>
                          ))}
                        </div>
                        <div className="p-2 text-[10px] text-[#94a3b8]">
                          <p className="truncate font-medium text-[#e2e8f0]">{p.fileName}</p>
                          <p>{p.hasGps ? `${p.lat?.toFixed(6)}, ${p.lon?.toFixed(6)}` : t("import.noGps")}</p>
                          {p.alt != null ? <p>{t("import.alt", { value: p.alt.toFixed(1) })}</p> : null}
                          {marks.length ? (
                            <p className="text-[#00c8f0]">{t("gcp.marksOnPhoto", { count: marks.length })}</p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : null}
            {view === "outputs" ? (
              project.outputs.length === 0 ? (
                <p className="min-h-[200px] text-sm text-[#94a3b8]">{t("outputs.empty")}</p>
              ) : (
                <ul className="space-y-2">
                  {project.outputs.map((o) => (
                    <li key={o.id} className="flex items-center justify-between rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium text-[#e2e8f0]">{o.label}</p>
                        <p className="text-xs text-[#64748b]">{o.fileName}</p>
                      </div>
                      {o.downloadPath ? (
                        <a href={o.downloadPath} className="text-xs text-[#00c8f0] underline" download>
                          {t("outputs.download")}
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )
            ) : null}
            {view === "log" ? (
              <pre className="max-h-[480px] overflow-y-auto whitespace-pre-wrap font-mono text-xs text-[#94a3b8]">
                {project.logs.length ? project.logs.join("\n") : t("log.empty")}
              </pre>
            ) : null}
          </div>
        </section>

        <aside className="rounded-xl border border-[#e5e7eb] bg-white p-4">
          <h3 className="text-sm font-semibold text-[#0f2848]">
            {activeStep === "import" ? t("settings.importTitle") : STEP_LABELS[activeStep as PipelineStepId]}
          </h3>

          {activeStep === "import" ? (
            <div className="mt-3 space-y-2 text-xs text-[#6b7280]">
              <p>{t("settings.importHint")}</p>
              <p>{t("settings.formats")}</p>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {activeStep === "align" ? (
                <>
                  <label className="block text-xs">
                    {t("settings.alignQuality")}
                    <select
                      value={project.settings.alignQuality}
                      onChange={(e) => updateSettings({ alignQuality: e.target.value as PhotogrammetrySettings["alignQuality"] })}
                      className="mt-1 w-full rounded-lg border border-[#d1d5db] px-2 py-1.5"
                    >
                      <option value="high">{t("settings.qualityHigh")}</option>
                      <option value="medium">{t("settings.qualityMedium")}</option>
                      <option value="low">{t("settings.qualityLow")}</option>
                    </select>
                  </label>
                  <label className="flex items-start gap-2 text-xs">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={project.settings.generateDenseCloud}
                      onChange={(e) => updateSettings({ generateDenseCloud: e.target.checked })}
                    />
                    <span>
                      {t("settings.generateDenseCloud")}
                      <span className="mt-0.5 block text-[10px] text-[#9ca3af]">{t("settings.generateDenseCloudHint")}</span>
                    </span>
                  </label>
                  <GcpPanel
                    project={project}
                    fileMap={fileMapRef.current}
                    onChange={patchProject}
                    onUpdateSettings={updateSettings}
                    selectedGcpId={selectedGcpId}
                    onSelectGcp={setSelectedGcpId}
                  />
                </>
              ) : null}
              {activeStep === "dense" ? (
                <>
                  <label className="flex items-start gap-2 text-xs">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={project.settings.generateDenseCloud}
                      onChange={(e) => updateSettings({ generateDenseCloud: e.target.checked })}
                    />
                    <span>{t("settings.generateDenseCloud")}</span>
                  </label>
                  {project.settings.generateDenseCloud ? (
                    <label className="block text-xs">
                      {t("settings.denseQuality")}
                      <select
                        value={project.settings.denseQuality}
                        onChange={(e) => updateSettings({ denseQuality: e.target.value as PhotogrammetrySettings["denseQuality"] })}
                        className="mt-1 w-full rounded-lg border border-[#d1d5db] px-2 py-1.5"
                      >
                        <option value="ultra">{t("settings.qualityUltra")}</option>
                        <option value="high">{t("settings.qualityHigh")}</option>
                        <option value="medium">{t("settings.qualityMedium")}</option>
                        <option value="low">{t("settings.qualityLow")}</option>
                      </select>
                    </label>
                  ) : (
                    <div className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-3 text-xs text-[#6b7280]">
                      <p>{t("settings.denseSkipHint")}</p>
                      {project.steps.align.status === "done" ? (
                        <button
                          type="button"
                          onClick={() => skipDenseAndGoToDem()}
                          className="mt-2 w-full rounded-lg border border-[#0f2848] px-3 py-2 text-sm font-medium text-[#0f2848] hover:bg-[#f3f4f6]"
                        >
                          {t("processing.goToDem")}
                        </button>
                      ) : null}
                    </div>
                  )}
                </>
              ) : null}
              {activeStep === "dem" ? (
                <>
                  <label className="block text-xs">
                    {t("settings.demResolution")}
                    <input
                      type="number"
                      min={1}
                      value={project.settings.demResolutionCm}
                      onChange={(e) => updateSettings({ demResolutionCm: Number(e.target.value) })}
                      className="mt-1 w-full rounded-lg border border-[#d1d5db] px-2 py-1.5"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={project.settings.generateDsm} onChange={(e) => updateSettings({ generateDsm: e.target.checked })} />
                    MDS (DSM)
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={project.settings.generateDtm} onChange={(e) => updateSettings({ generateDtm: e.target.checked })} />
                    MDT (DTM)
                  </label>
                </>
              ) : null}
              {activeStep === "orthophoto" ? (
                <label className="block text-xs">
                  {t("settings.orthoResolution")}
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={project.settings.orthoResolutionCm}
                    onChange={(e) => updateSettings({ orthoResolutionCm: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-[#d1d5db] px-2 py-1.5"
                  />
                </label>
              ) : null}

              <button
                type="button"
                onClick={() => void runStep(activeStep as PipelineStepId)}
                disabled={
                  processing ||
                  project.photos.length < 2 ||
                  project.steps[activeStep as PipelineStepId].status === "running" ||
                  project.steps[activeStep as PipelineStepId].status === "skipped" ||
                  Boolean(stepBlockedReason(activeStep as PipelineStepId, project))
                }
                className="mt-2 w-full rounded-lg bg-[#0f2848] px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {processing ? t("processing.running") : t("processing.runStep")}
              </button>

              {activeStep === "dense" && project.settings.generateDenseCloud && project.steps.align.status === "done" ? (
                <button
                  type="button"
                  onClick={() => skipDenseAndGoToDem()}
                  disabled={processing}
                  className="w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-xs text-[#6b7280] hover:bg-[#f9fafb] disabled:opacity-40"
                >
                  {t("processing.skipDense")}
                </button>
              ) : null}

              {project.steps[activeStep as PipelineStepId].message ? (
                <p className="text-xs text-[#6b7280]">{project.steps[activeStep as PipelineStepId].message}</p>
              ) : null}
            </div>
          )}

          <div
            className={`mt-6 rounded-lg border p-3 text-xs ${
              odmStatus?.available
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            {odmStatus?.available
              ? t("settings.odmConnected", { version: odmStatus.version ?? "NodeODM" })
              : odmStatus?.configured
                ? t("settings.odmOffline")
                : t("settings.odmNotConfigured")}
            {odmStatus?.available ? (
              <button
                type="button"
                onClick={() => void clearOdmQueue()}
                className="mt-2 block w-full rounded border border-emerald-300 bg-white px-2 py-1.5 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
              >
                {t("processing.clearQueue")}
              </button>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
