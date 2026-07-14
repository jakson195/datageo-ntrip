export type PipelineStepId = "align" | "dense" | "dem" | "orthophoto";

export type StepStatus = "idle" | "ready" | "running" | "done" | "error" | "skipped";

export interface PhotoAsset {
  id: string;
  fileName: string;
  thumbUrl: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  lat?: number;
  lon?: number;
  alt?: number;
  yaw?: number;
  pitch?: number;
  roll?: number;
  capturedAt?: string;
  camera?: string;
  hasGps: boolean;
}

export interface PipelineStep {
  id: PipelineStepId;
  status: StepStatus;
  progress: number;
  message?: string;
  jobId?: string;
}

export interface PhotogrammetryOutput {
  id: string;
  stepId: PipelineStepId;
  label: string;
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
  previewUrl?: string;
  downloadPath?: string;
}

export interface PhotogrammetrySettings {
  alignQuality: "high" | "medium" | "low";
  denseQuality: "ultra" | "high" | "medium" | "low";
  /** Se false, pula a etapa 3 (nuvem densa) e segue para DEM → ortofoto. */
  generateDenseCloud: boolean;
  demResolutionCm: number;
  orthoResolutionCm: number;
  generateDtm: boolean;
  generateDsm: boolean;
  /** Usar pontos de controle (GCP) no processamento ODM. */
  useGcp: boolean;
  /** Alvos físicos com X branco pintado/colocado em campo. */
  fieldTargetWhiteX: boolean;
  /** Projeção das coordenadas dos GCP (ex.: EPSG:4326 ou EPSG:31982). */
  gcpProjection: string;
}

export interface GcpObservation {
  photoId: string;
  fileName: string;
  pixelX: number;
  pixelY: number;
  autoDetected: boolean;
}

export interface PhotogrammetryGcp {
  id: string;
  name: string;
  /** Longitude ou coordenada E (conforme gcpProjection). */
  easting: number;
  /** Latitude ou coordenada N (conforme gcpProjection). */
  northing: number;
  elevation: number;
  observations: GcpObservation[];
}

export interface PhotogrammetryProject {
  id: string;
  name: string;
  photos: PhotoAsset[];
  steps: Record<PipelineStepId, PipelineStep>;
  outputs: PhotogrammetryOutput[];
  settings: PhotogrammetrySettings;
  gcps: PhotogrammetryGcp[];
  logs: string[];
  updatedAt: string;
}

export type PhotogrammetryJobStatus = "queued" | "processing" | "completed" | "failed";

export interface PhotogrammetryJob {
  id: string;
  userId: string;
  projectId: string;
  stepId: PipelineStepId;
  status: PhotogrammetryJobStatus;
  progress: number;
  message: string;
  mode: "odm" | "demo";
  outputs: PhotogrammetryOutput[];
  error?: string;
  odmTaskId?: string;
  demoStartedAt?: string;
  photoCount?: number;
  /** Último progresso reportado pelo ODM (detecção de travamento aparente). */
  lastOdmProgress?: number;
  odmStallSince?: string;
  lastConsoleFetch?: string;
  createdAt: string;
  updatedAt: string;
}

export const PIPELINE_STEPS: PipelineStepId[] = ["align", "dense", "dem", "orthophoto"];

export const DEFAULT_SETTINGS: PhotogrammetrySettings = {
  alignQuality: "high",
  denseQuality: "high",
  generateDenseCloud: true,
  demResolutionCm: 5,
  orthoResolutionCm: 2,
  generateDtm: true,
  generateDsm: true,
  useGcp: false,
  fieldTargetWhiteX: false,
  gcpProjection: "EPSG:4326",
};

/** Etapas ativas conforme configuração (nuvem densa opcional). */
export function pipelineStepsFor(settings: PhotogrammetrySettings): PipelineStepId[] {
  return settings.generateDenseCloud
    ? PIPELINE_STEPS
    : PIPELINE_STEPS.filter((s) => s !== "dense");
}

export function nextPipelineStep(
  current: PipelineStepId,
  settings: PhotogrammetrySettings,
): PipelineStepId | undefined {
  const steps = pipelineStepsFor(settings);
  const idx = steps.indexOf(current);
  return idx >= 0 ? steps[idx + 1] : undefined;
}

export function denseStepSkipped(settings: PhotogrammetrySettings): boolean {
  return !settings.generateDenseCloud;
}

export function emptySteps(): Record<PipelineStepId, PipelineStep> {
  return {
    align: { id: "align", status: "idle", progress: 0 },
    dense: { id: "dense", status: "idle", progress: 0 },
    dem: { id: "dem", status: "idle", progress: 0 },
    orthophoto: { id: "orthophoto", status: "idle", progress: 0 },
  };
}

export function newProject(name = "Projeto aerofotogramétrico"): PhotogrammetryProject {
  const id = `ph_${Date.now().toString(36)}`;
  return {
    id,
    name,
    photos: [],
    steps: emptySteps(),
    outputs: [],
    settings: { ...DEFAULT_SETTINGS },
    gcps: [],
    logs: [],
    updatedAt: new Date().toISOString(),
  };
}

export const PHOTOGRAMMETRY_STORAGE_KEY = "datageo:photogrammetry-project";
