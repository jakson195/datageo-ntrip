import type { CoverageData, CoverageLayer } from "./coverage-types";

const CACHE_PREFIX = "sdn_coverage_v3";
const CACHE_TTL = 6 * 60 * 60 * 1000;
const MAX_BYTES = 4_000_000;

function key(layer: CoverageLayer) {
  return `${CACHE_PREFIX}:${layer}`;
}

function readLayer(layer: CoverageLayer): GeoJSON.Feature | null {
  try {
    const raw = sessionStorage.getItem(key(layer));
    if (!raw) return null;
    const { ts, feature } = JSON.parse(raw) as { ts: number; feature: GeoJSON.Feature };
    return Date.now() - ts < CACHE_TTL ? feature : null;
  } catch {
    return null;
  }
}

function writeLayer(layer: CoverageLayer, feature: GeoJSON.Feature | undefined) {
  if (!feature) return;
  try {
    const payload = JSON.stringify({ ts: Date.now(), feature });
    if (payload.length > MAX_BYTES) return;
    sessionStorage.setItem(key(layer), payload);
  } catch {
    /* quota */
  }
}

export function getCoverageCache(): CoverageData | null {
  const coverage25 = readLayer("25") ?? undefined;
  const coverage100 = readLayer("100") ?? undefined;
  if (!coverage25 && !coverage100) return null;
  return { coverage25, coverage100 };
}

export function setCoverageCache(data: CoverageData) {
  writeLayer("25", data.coverage25);
  writeLayer("100", data.coverage100);
}

export function mergeCoverageCache(partial: CoverageData): CoverageData {
  const prev = getCoverageCache() ?? {};
  const merged = {
    coverage25: partial.coverage25 ?? prev.coverage25,
    coverage100: partial.coverage100 ?? prev.coverage100,
  };
  setCoverageCache(merged);
  return merged;
}
