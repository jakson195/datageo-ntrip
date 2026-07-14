import { lusolve, matrix, multiply, transpose, type Matrix } from "mathjs";
import {
  applyTranslation,
  computeMeanTranslation,
  computeRms,
  enrichControlPoints,
} from "./control-point";
import type {
  AdjustmentParams,
  AdjustmentResult,
  ControlPointInput,
  Helmert2DParams,
  Helmert3DParams,
  SurveyPoint,
} from "./types";

function activeControls(points: ControlPointInput[]) {
  return points.filter((p) => !p.excluded);
}

function residualsBefore(points: ControlPointInput[]) {
  return activeControls(points).map((p) => ({
    e: p.eKnown - p.eObserved,
    n: p.nKnown - p.nObserved,
    z: p.zKnown - p.zObserved,
  }));
}

function transformHelmert2D(e: number, n: number, params: Helmert2DParams) {
  const cos = Math.cos(params.rotationRad);
  const sin = Math.sin(params.rotationRad);
  const s = params.scale;
  return {
    e: s * (cos * e - sin * n) + params.tx,
    n: s * (sin * e + cos * n) + params.ty,
  };
}

function transformHelmert3D(e: number, n: number, z: number, params: Helmert3DParams) {
  const s = 1 + params.scale;
  const { rx, ry, rz, tx, ty, tz } = params;
  return {
    e: s * (e + rz * n - ry * z) + tx,
    n: s * (-rz * e + n + rx * z) + ty,
    z: s * (ry * e - rx * n + z) + tz,
  };
}

export function solveHelmert2D(points: ControlPointInput[]): Helmert2DParams {
  const active = activeControls(points);
  if (active.length < 2) {
    const t = computeMeanTranslation(active);
    return { method: "HELMERT_2D", tx: t.deltaE, ty: t.deltaN, rotationRad: 0, scale: 1, a: 1, b: 0 };
  }

  const rows: number[][] = [];
  const L: number[] = [];
  for (const p of active) {
    rows.push([1, 0, p.eObserved, -p.nObserved]);
    L.push(p.eKnown);
    rows.push([0, 1, p.nObserved, p.eObserved]);
    L.push(p.nKnown);
  }

  const A = matrix(rows);
  const Lm = matrix(L.map((v) => [v]));
  const x = lusolve(multiply(transpose(A), A), multiply(transpose(A), Lm)) as Matrix;
  const tx = x.get([0, 0]) as number;
  const ty = x.get([1, 0]) as number;
  const a = x.get([2, 0]) as number;
  const b = x.get([3, 0]) as number;
  return {
    method: "HELMERT_2D",
    tx,
    ty,
    rotationRad: Math.atan2(b, a),
    scale: Math.hypot(a, b),
    a,
    b,
  };
}

export function solveHelmert3D(points: ControlPointInput[]): Helmert3DParams {
  const active = activeControls(points);
  if (active.length < 3) {
    const t = computeMeanTranslation(active);
    return { method: "HELMERT_3D", tx: t.deltaE, ty: t.deltaN, tz: t.deltaZ, rx: 0, ry: 0, rz: 0, scale: 0 };
  }

  const rows: number[][] = [];
  const L: number[] = [];
  for (const p of active) {
    const { eObserved: e, nObserved: n, zObserved: z } = p;
    rows.push([1, 0, 0, 0, z, -n, e]);
    L.push(p.eKnown - e);
    rows.push([0, 1, 0, z, 0, -e, n]);
    L.push(p.nKnown - n);
    rows.push([0, 0, 1, -n, e, 0, e]);
    L.push(p.zKnown - z);
  }

  const A = matrix(rows);
  const Lm = matrix(L.map((v) => [v]));
  let x: Matrix;
  try {
    x = lusolve(multiply(transpose(A), A), multiply(transpose(A), Lm)) as Matrix;
  } catch {
    const t = computeMeanTranslation(active);
    return { method: "HELMERT_3D", tx: t.deltaE, ty: t.deltaN, tz: t.deltaZ, rx: 0, ry: 0, rz: 0, scale: 0 };
  }

  return {
    method: "HELMERT_3D",
    tx: x.get([0, 0]) as number,
    ty: x.get([1, 0]) as number,
    tz: x.get([2, 0]) as number,
    rx: x.get([3, 0]) as number,
    ry: x.get([4, 0]) as number,
    rz: x.get([5, 0]) as number,
    scale: x.get([6, 0]) as number,
  };
}

function applyParams(e: number, n: number, z: number, params: AdjustmentParams) {
  if (params.method === "TRANSLATION") return applyTranslation(e, n, z, params);
  if (params.method === "HELMERT_2D") {
    const t = transformHelmert2D(e, n, params);
    return { e: t.e, n: t.n, z };
  }
  return transformHelmert3D(e, n, z, params);
}

export function runAdjustment(
  surveyPoints: SurveyPoint[],
  controlPoints: ControlPointInput[],
  method: "TRANSLATION" | "HELMERT_2D" | "HELMERT_3D",
): AdjustmentResult {
  const before = residualsBefore(controlPoints);
  const rmsBefore = computeRms(before);
  const rmsHorizBefore = computeRms(before, "horizontal");
  const rmsVertBefore = computeRms(before, "vertical");

  let params: AdjustmentParams;
  if (method === "TRANSLATION") {
    params = { method: "TRANSLATION", ...computeMeanTranslation(controlPoints) };
  } else if (method === "HELMERT_2D") {
    params = solveHelmert2D(controlPoints);
  } else {
    params = solveHelmert3D(controlPoints);
  }

  const residualMap = new Map<string, { e: number; n: number; z: number }>();
  for (const p of activeControls(controlPoints)) {
    const t = applyParams(p.eObserved, p.nObserved, p.zObserved, params);
    residualMap.set(p.id, { e: p.eKnown - t.e, n: p.nKnown - t.n, z: p.zKnown - t.z });
  }

  const after = [...residualMap.values()];
  return {
    params,
    rmsBefore,
    rmsAfter: computeRms(after),
    rmsHorizBefore,
    rmsHorizAfter: computeRms(after, "horizontal"),
    rmsVertBefore,
    rmsVertAfter: computeRms(after, "vertical"),
    controlPoints: enrichControlPoints(controlPoints, residualMap),
    surveyPoints: surveyPoints.map((pt) => {
      const t = applyParams(pt.e, pt.n, pt.z, params);
      return { ...pt, eCorr: t.e, nCorr: t.n, zCorr: t.z };
    }),
  };
}
