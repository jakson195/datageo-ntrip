import type { PhotogrammetryGcp, PhotogrammetrySettings } from "./types";
import type { WhiteXDetection } from "./white-x-detector";

/** Associa detecções a GCPs pela disposição relativa (ângulo a partir do centroide). */
export function linkDetectionsToGcps(
  gcps: PhotogrammetryGcp[],
  detections: WhiteXDetection[],
): Map<string, WhiteXDetection> {
  const active = gcps.filter((g) => Number.isFinite(g.easting) && Number.isFinite(g.northing));
  if (!active.length || !detections.length) return new Map();

  const cenE = active.reduce((s, g) => s + g.easting, 0) / active.length;
  const cenN = active.reduce((s, g) => s + g.northing, 0) / active.length;
  const detCenX = detections.reduce((s, d) => s + d.pixelX, 0) / detections.length;
  const detCenY = detections.reduce((s, d) => s + d.pixelY, 0) / detections.length;

  const gcpRanked = active
    .map((g) => ({
      name: g.name,
      angle: Math.atan2(g.northing - cenN, g.easting - cenE),
    }))
    .sort((a, b) => a.angle - b.angle);

  const detRanked = detections
    .map((d, i) => ({
      i,
      angle: Math.atan2(d.pixelY - detCenY, d.pixelX - detCenX),
    }))
    .sort((a, b) => a.angle - b.angle);

  const linked = new Map<string, WhiteXDetection>();
  const n = Math.min(gcpRanked.length, detRanked.length);
  for (let k = 0; k < n; k++) {
    linked.set(gcpRanked[k].name, detections[detRanked[k].i]);
  }
  return linked;
}

export function buildGcpListText(gcps: PhotogrammetryGcp[], projection: string): string | null {
  const lines: string[] = [projection.trim() || "EPSG:4326"];
  for (const gcp of gcps) {
    for (const obs of gcp.observations) {
      lines.push(
        [
          gcp.easting,
          gcp.northing,
          gcp.elevation,
          obs.pixelX.toFixed(2),
          obs.pixelY.toFixed(2),
          obs.fileName,
          gcp.name,
        ].join(" "),
      );
    }
  }
  return lines.length > 1 ? lines.join("\n") : null;
}

export function countGcpObservations(gcps: PhotogrammetryGcp[]): number {
  return gcps.reduce((n, g) => n + g.observations.length, 0);
}

export function gcpReadyForProcessing(
  settings: PhotogrammetrySettings,
  gcps: PhotogrammetryGcp[],
): boolean {
  if (!settings.useGcp) return false;
  return countGcpObservations(gcps) >= 3;
}
