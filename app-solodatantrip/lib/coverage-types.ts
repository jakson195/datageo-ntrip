export type CoverageLayer = "25" | "100" | "all";

export type CoverageData = {
  coverage25?: GeoJSON.Feature;
  coverage100?: GeoJSON.Feature;
};

export type CoverageApiPayload = {
  code?: number;
  msg?: string;
  data?: CoverageData;
};
