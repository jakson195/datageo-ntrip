export interface SurveyPoint {
  id: string;
  code?: string;
  name: string;
  description?: string;
  e: number;
  n: number;
  z: number;
  eCorr?: number;
  nCorr?: number;
  zCorr?: number;
  properties?: Record<string, unknown>;
}

export interface ControlPointInput {
  id: string;
  name: string;
  source?: "manual" | "imported";
  linkedSurveyPointId?: string;
  observedCode?: string;
  observedDescription?: string;
  eKnown: number;
  nKnown: number;
  zKnown: number;
  eObserved: number;
  nObserved: number;
  zObserved: number;
  excluded?: boolean;
}

export interface ControlPointStats {
  deltaE: number;
  deltaN: number;
  deltaZ: number;
  horizError: number;
  vertError: number;
  rms: number;
}

export interface ControlPointWithStats extends ControlPointInput, ControlPointStats {
  residualE?: number;
  residualN?: number;
  residualZ?: number;
  isOutlier?: boolean;
}

export interface TranslationAdjustment {
  method: "TRANSLATION";
  deltaE: number;
  deltaN: number;
  deltaZ: number;
}

export interface Helmert2DParams {
  method: "HELMERT_2D";
  tx: number;
  ty: number;
  rotationRad: number;
  scale: number;
  a: number;
  b: number;
}

export interface Helmert3DParams {
  method: "HELMERT_3D";
  tx: number;
  ty: number;
  tz: number;
  rx: number;
  ry: number;
  rz: number;
  scale: number;
}

export type AdjustmentParams = TranslationAdjustment | Helmert2DParams | Helmert3DParams;

export interface AdjustmentResult {
  params: AdjustmentParams;
  rmsBefore: number;
  rmsAfter: number;
  rmsHorizBefore: number;
  rmsHorizAfter: number;
  rmsVertBefore: number;
  rmsVertAfter: number;
  controlPoints: ControlPointWithStats[];
  surveyPoints: SurveyPoint[];
}

export interface OutlierAnalysis {
  meanResidual: number;
  stdResidual: number;
  threshold3Sigma: number;
  outliers: string[];
}

export interface ParseResult {
  points: SurveyPoint[];
  crs?: string;
  format: "csv" | "txt" | "dxf" | "geojson" | "xlsx" | "xls";
  warnings: string[];
}

export interface QualityDailyRecord {
  date: string;
  fixCount: number;
  floatCount: number;
  avgSatellites: number | null;
  avgHdop: number | null;
  avgVdop: number | null;
  avgCorrectionAge: number | null;
  uptimePercent: number | null;
  avgLatencyMs: number | null;
  avgHorizPrecision: number | null;
  avgVertPrecision: number | null;
}

