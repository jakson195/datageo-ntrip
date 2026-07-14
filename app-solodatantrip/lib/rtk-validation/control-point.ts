import type { ControlPointInput, ControlPointStats, ControlPointWithStats } from "./types";

export function computeSingleControlStats(
  known: { e: number; n: number; z: number },
  observed: { e: number; n: number; z: number },
): ControlPointStats {
  const deltaE = known.e - observed.e;
  const deltaN = known.n - observed.n;
  const deltaZ = known.z - observed.z;
  const horizError = Math.hypot(deltaE, deltaN);
  const vertError = Math.abs(deltaZ);
  const rms = Math.sqrt((deltaE ** 2 + deltaN ** 2 + deltaZ ** 2) / 3);
  return { deltaE, deltaN, deltaZ, horizError, vertError, rms };
}

export function computeMeanTranslation(points: ControlPointInput[]) {
  const active = points.filter((p) => !p.excluded);
  if (active.length === 0) return { deltaE: 0, deltaN: 0, deltaZ: 0 };
  const sum = active.reduce(
    (acc, p) => ({
      deltaE: acc.deltaE + (p.eKnown - p.eObserved),
      deltaN: acc.deltaN + (p.nKnown - p.nObserved),
      deltaZ: acc.deltaZ + (p.zKnown - p.zObserved),
    }),
    { deltaE: 0, deltaN: 0, deltaZ: 0 },
  );
  const n = active.length;
  return { deltaE: sum.deltaE / n, deltaN: sum.deltaN / n, deltaZ: sum.deltaZ / n };
}

export function applyTranslation(
  e: number,
  n: number,
  z: number,
  delta: { deltaE: number; deltaN: number; deltaZ: number },
) {
  return { e: e + delta.deltaE, n: n + delta.deltaN, z: z + delta.deltaZ };
}

export function computeRms(
  residuals: { e: number; n: number; z: number }[],
  mode: "3d" | "horizontal" | "vertical" = "3d",
): number {
  if (residuals.length === 0) return 0;
  const squares = residuals.map((r) => {
    if (mode === "horizontal") return r.e ** 2 + r.n ** 2;
    if (mode === "vertical") return r.z ** 2;
    return r.e ** 2 + r.n ** 2 + r.z ** 2;
  });
  const divisor = mode === "3d" ? 3 : mode === "horizontal" ? 2 : 1;
  const mean = squares.reduce((a, b) => a + b, 0) / (residuals.length * divisor);
  return Math.sqrt(mean);
}

export function enrichControlPoints(
  points: ControlPointInput[],
  residuals?: Map<string, { e: number; n: number; z: number }>,
): ControlPointWithStats[] {
  return points.map((p) => {
    const stats = computeSingleControlStats(
      { e: p.eKnown, n: p.nKnown, z: p.zKnown },
      { e: p.eObserved, n: p.nObserved, z: p.zObserved },
    );
    const res = residuals?.get(p.id);
    return { ...p, ...stats, residualE: res?.e, residualN: res?.n, residualZ: res?.z };
  });
}

export function computeIndividualRms(points: ControlPointWithStats[]): ControlPointWithStats[] {
  return points.map((p) => {
    const e = p.residualE ?? p.deltaE;
    const n = p.residualN ?? p.deltaN;
    const z = p.residualZ ?? p.deltaZ;
    return { ...p, rms: Math.sqrt((e ** 2 + n ** 2 + z ** 2) / 3) };
  });
}

export function computeGlobalRms(points: ControlPointWithStats[]): number {
  const active = points.filter((p) => !p.excluded);
  return computeRms(
    active.map((p) => ({
      e: p.residualE ?? p.deltaE,
      n: p.residualN ?? p.deltaN,
      z: p.residualZ ?? p.deltaZ,
    })),
  );
}
