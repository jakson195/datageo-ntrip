import type { ControlPointWithStats, OutlierAnalysis } from "./types";

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function detectOutliers3Sigma(
  points: ControlPointWithStats[],
): OutlierAnalysis & { updatedPoints: ControlPointWithStats[] } {
  const active = points.filter((p) => !p.excluded);
  const magnitudes = active.map((p) =>
    Math.sqrt(
      (p.residualE ?? p.deltaE) ** 2 +
        (p.residualN ?? p.deltaN) ** 2 +
        (p.residualZ ?? p.deltaZ) ** 2,
    ),
  );

  const meanResidual =
    magnitudes.length > 0 ? magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length : 0;
  const stdResidual = stdDev(magnitudes);
  const threshold3Sigma = meanResidual + 3 * stdResidual;

  const outlierIds = new Set<string>();
  active.forEach((p, i) => {
    if (magnitudes[i] > threshold3Sigma && stdResidual > 0) outlierIds.add(p.id);
  });

  return {
    meanResidual,
    stdResidual,
    threshold3Sigma,
    outliers: [...outlierIds],
    updatedPoints: points.map((p) => ({ ...p, isOutlier: outlierIds.has(p.id) })),
  };
}
