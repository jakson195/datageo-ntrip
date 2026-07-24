/** Converte WKT OGC (POLYGON / MULTIPOLYGON) em GeoJSON — SICAR retorna poligonoAreaTema em WKT. */

type Position = [number, number];

function parseCoordinatePair(pair: string): Position | null {
  const parts = pair.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const lon = Number(parts[0]);
  const lat = Number(parts[1]);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  return [lon, lat];
}

function parseRing(raw: string): Position[] | null {
  const coords = raw
    .split(",")
    .map(parseCoordinatePair)
    .filter((p): p is Position => p !== null);
  if (coords.length < 3) return null;
  return coords;
}

function extractParenContent(wkt: string, startIdx: number): { inner: string; endIdx: number } | null {
  if (wkt[startIdx] !== "(") return null;
  let depth = 0;
  for (let i = startIdx; i < wkt.length; i++) {
    if (wkt[i] === "(") depth++;
    else if (wkt[i] === ")") {
      depth--;
      if (depth === 0) {
        return { inner: wkt.slice(startIdx + 1, i), endIdx: i + 1 };
      }
    }
  }
  return null;
}

function parsePolygonBody(body: string): Position[][] | null {
  const rings: Position[][] = [];
  let i = 0;
  while (i < body.length) {
    while (i < body.length && body[i] !== "(") i++;
    if (i >= body.length) break;
    const segment = extractParenContent(body, i);
    if (!segment) break;
    const ring = parseRing(segment.inner);
    if (ring) rings.push(ring);
    i = segment.endIdx;
  }
  return rings.length > 0 ? rings : null;
}

export function wktToGeoJson(wktRaw: string): GeoJSON.Geometry | null {
  const wkt = wktRaw.trim();
  if (!wkt) return null;

  const upper = wkt.toUpperCase();

  if (upper.startsWith("MULTIPOLYGON")) {
    const bodyStart = wkt.indexOf("(");
    if (bodyStart < 0) return null;
    const body = wkt.slice(bodyStart);
    const polygons: Position[][][] = [];
    let i = 0;
    while (i < body.length) {
      while (i < body.length && body[i] !== "(") i++;
      if (i >= body.length) break;
      const polySegment = extractParenContent(body, i);
      if (!polySegment) break;
      const rings = parsePolygonBody(polySegment.inner);
      if (rings) polygons.push(rings);
      i = polySegment.endIdx;
    }
    if (polygons.length === 0) return null;
    if (polygons.length === 1) {
      return { type: "Polygon", coordinates: polygons[0]! };
    }
    return { type: "MultiPolygon", coordinates: polygons };
  }

  if (upper.startsWith("POLYGON")) {
    const bodyStart = wkt.indexOf("(");
    if (bodyStart < 0) return null;
    const rings = parsePolygonBody(wkt.slice(bodyStart));
    if (!rings) return null;
    return { type: "Polygon", coordinates: rings };
  }

  return null;
}

export function wktToFeatureCollection(
  items: { tema: string; wkt: string }[],
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const item of items) {
    const geometry = wktToGeoJson(item.wkt);
    if (!geometry) continue;
    features.push({
      type: "Feature",
      properties: { tema: item.tema, NOME: item.tema },
      geometry,
    });
  }
  return { type: "FeatureCollection", features };
}
