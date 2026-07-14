import type { PhotogrammetrySettings, PipelineStepId } from "./types";

/** Formato exigido pelo NodeODM: [{ name, value }, …] (sem prefixo --). */
export type OdmOption = { name: string; value: string | number | boolean };

export function odmOptionsForStep(stepId: PipelineStepId, settings: PhotogrammetrySettings): OdmOption[] {
  const qualityMap = { ultra: "ultra", high: "high", medium: "medium", low: "low" } as const;
  const pcQuality = qualityMap[settings.denseQuality] ?? "high";
  const featureQuality = settings.alignQuality;

  switch (stepId) {
    case "align":
      return [
        { name: "feature-quality", value: featureQuality },
        { name: "end-with", value: "opensfm" },
        { name: "skip-3dmodel", value: true },
        { name: "skip-orthophoto", value: true },
      ];
    case "dense":
      return [
        { name: "feature-quality", value: featureQuality },
        { name: "pc-quality", value: pcQuality },
        { name: "end-with", value: "odm_filterpoints" },
        { name: "skip-orthophoto", value: true },
      ];
    case "dem":
      return [
        { name: "feature-quality", value: featureQuality },
        { name: "pc-quality", value: pcQuality },
        { name: "dem-resolution", value: Math.max(0.01, settings.demResolutionCm / 100) },
        { name: "dsm", value: settings.generateDsm },
        { name: "dtm", value: settings.generateDtm },
        { name: "end-with", value: "odm_dem" },
        { name: "skip-orthophoto", value: true },
      ];
    case "orthophoto":
      return [
        { name: "feature-quality", value: featureQuality },
        { name: "pc-quality", value: pcQuality },
        { name: "orthophoto-resolution", value: Math.max(0.005, settings.orthoResolutionCm / 100) },
        ...(settings.generateDsm ? [{ name: "dsm", value: true } as OdmOption] : []),
        ...(settings.generateDtm ? [{ name: "dtm", value: true } as OdmOption] : []),
        { name: "skip-3dmodel", value: true },
      ];
    default:
      return [{ name: "feature-quality", value: featureQuality }];
  }
}

export function demoDurationMs(stepId: PipelineStepId, photoCount: number): number {
  const base = { align: 8000, dense: 14000, dem: 10000, orthophoto: 12000 }[stepId];
  return base + Math.min(photoCount * 120, 20000);
}

export function demoOutputs(stepId: PipelineStepId, projectId: string): Array<{
  id: string;
  stepId: PipelineStepId;
  label: string;
  fileName: string;
  mimeType: string;
}> {
  const prefix = `${projectId}_${stepId}`;
  switch (stepId) {
    case "align":
      return [
        { id: `${prefix}_cameras`, stepId, label: "Poses das câmeras", fileName: "cameras.json", mimeType: "application/json" },
        { id: `${prefix}_sparse`, stepId, label: "Nuvem esparsa", fileName: "sparse_cloud.laz", mimeType: "application/octet-stream" },
      ];
    case "dense":
      return [
        { id: `${prefix}_dense`, stepId, label: "Nuvem densa", fileName: "dense_cloud.laz", mimeType: "application/octet-stream" },
        { id: `${prefix}_mesh`, stepId, label: "Malha 3D", fileName: "mesh.ply", mimeType: "application/octet-stream" },
      ];
    case "dem":
      return [
        { id: `${prefix}_dsm`, stepId, label: "MDS (DSM)", fileName: "dsm.tif", mimeType: "image/tiff" },
        { id: `${prefix}_dtm`, stepId, label: "MDT (DTM)", fileName: "dtm.tif", mimeType: "image/tiff" },
      ];
    case "orthophoto":
      return [
        { id: `${prefix}_ortho`, stepId, label: "Ortofoto", fileName: "orthophoto.tif", mimeType: "image/tiff" },
        { id: `${prefix}_tiles`, stepId, label: "Tiles web", fileName: "orthophoto_tiles.zip", mimeType: "application/zip" },
      ];
  }
}
