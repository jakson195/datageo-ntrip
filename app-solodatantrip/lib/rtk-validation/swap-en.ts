import type { ControlPointInput, SurveyPoint } from "./types";

/** Troca física E↔N para georreferenciar: E=Este, N=Norte */
export function swapSurveyPointEn(pt: SurveyPoint): SurveyPoint {
  return {
    ...pt,
    e: pt.n,
    n: pt.e,
    eCorr: pt.nCorr,
    nCorr: pt.eCorr,
  };
}

export function swapAllSurveyPointsEn(points: SurveyPoint[]): SurveyPoint[] {
  return points.map(swapSurveyPointEn);
}

export function swapControlKnownEn(cp: ControlPointInput): ControlPointInput {
  return { ...cp, eKnown: cp.nKnown, nKnown: cp.eKnown };
}

export function swapControlObservedEn(cp: ControlPointInput): ControlPointInput {
  return { ...cp, eObserved: cp.nObserved, nObserved: cp.eObserved };
}

export function swapControlAllEn(cp: ControlPointInput): ControlPointInput {
  return swapControlObservedEn(swapControlKnownEn(cp));
}

export function formatCoordLabel(e: number, n: number, z: number) {
  return `E ${e.toFixed(3)}, N ${n.toFixed(3)}, Z ${z.toFixed(3)}`;
}
