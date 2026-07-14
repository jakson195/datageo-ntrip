import { detectSirgasUtmFromSamples, detectSirgasUtmZone, enToLatLon, formatSirgasUtmProjection, latLonToEn, resolveEnToLatLon } from "@/lib/rtk-validation/project-coords";
import type { CadEntity, CadProject, CadVertex } from "./types";
import { isLikelyUtmViewport } from "./utm-bounds";

const SURVEY_LAYER_IDS = new Set(["rtk_points", "ctrl_known", "ctrl_obs", "draw"]);

export interface CadGeorefContext {
  utmZone: number;
  /** EPSG SIRGAS 2000 / UTM Sul (ex.: EPSG:31983). */
  utmEpsg: string;
  /** Texto de projeção para memorial/prancha. */
  utmProjectionLabel: string;
  /** E (UTM) armazenado em x ou y no CadVertex. */
  eastingAxis: "x" | "y";
  /** N (UTM) armazenado em x ou y no CadVertex. */
  northingAxis: "x" | "y";
  /** Coordenadas parecem UTM georreferenciadas (metros). */
  isGeoreferenced: boolean;
}

function collectVertices(entities: CadEntity[], layerFilter?: Set<string>): CadVertex[] {
  const out: CadVertex[] = [];
  for (const entity of entities) {
    if (layerFilter && !layerFilter.has(entity.layerId)) continue;
    if (entity.type === "point") out.push({ x: entity.x, y: entity.y, z: entity.z });
    else if (entity.type === "line") out.push(entity.start, entity.end);
    else out.push(...entity.vertices);
  }
  return out;
}

function parseZoneFromCrs(crs?: string): number | null {
  if (!crs) return null;
  const m = crs.match(/(?:EPSG:|UTM\s*)\s*(\d{2})(?:S|N)?/i) ?? crs.match(/319(\d{2})/);
  if (!m) return null;
  const zone = Number(m[1]);
  return zone >= 18 && zone <= 25 ? zone : null;
}

function buildGeoref(
  zone: number,
  eastingAxis: "x" | "y",
  northingAxis: "x" | "y",
  isGeoreferenced: boolean,
): CadGeorefContext {
  return {
    utmZone: zone,
    utmEpsg: `EPSG:${31960 + zone}`,
    utmProjectionLabel: formatSirgasUtmProjection(zone),
    eastingAxis,
    northingAxis,
    isGeoreferenced,
  };
}

/** Detecta fuso UTM e se E/N estão em x/y ou y/x (comum em levantamentos). */
export function detectCadGeoref(
  entities: CadEntity[],
  viewport?: { minX: number; maxX: number; minY: number; maxY: number },
  crs?: string,
): CadGeorefContext {
  const surveyVerts = collectVertices(entities, SURVEY_LAYER_IDS);
  const allVerts = surveyVerts.length > 0 ? surveyVerts : collectVertices(entities);

  let eastingAxis: "x" | "y" = "x";
  let northingAxis: "x" | "y" = "y";
  let utmZone = parseZoneFromCrs(crs) ?? 23;

  if (allVerts.length > 0) {
    const detected = detectSirgasUtmFromSamples(allVerts);
    utmZone = detected.zone;
    eastingAxis = detected.eastingAxis;
    northingAxis = detected.northingAxis;
  } else if (viewport && isLikelyUtmViewport(viewport)) {
    const cx = (viewport.minX + viewport.maxX) / 2;
    const cy = (viewport.minY + viewport.maxY) / 2;
    const resolved = resolveEnToLatLon(cx, cy);
    utmZone = resolved.zone;
    if (resolved.swapped) {
      eastingAxis = "y";
      northingAxis = "x";
    }
  }

  const bounds = allVerts.length > 0 ? boundsFromVerts(allVerts) : viewport;
  const isGeoreferenced = bounds ? isLikelyUtmViewport(bounds) : false;

  // CRS explícito UTM só quando não há coordenadas georreferenciadas detectadas.
  const crsZone = parseZoneFromCrs(crs);
  if (crsZone != null && !isGeoreferenced) {
    utmZone = crsZone;
  }

  return buildGeoref(utmZone, eastingAxis, northingAxis, isGeoreferenced);
}

/** Contexto UTM explícito (importação de overlays, APIs). */
export function createCadGeorefContext(
  utmZone: number,
  eastingAxis: "x" | "y" = "x",
  northingAxis: "x" | "y" = "y",
  isGeoreferenced = true,
): CadGeorefContext {
  return buildGeoref(utmZone, eastingAxis, northingAxis, isGeoreferenced);
}

export function detectCadGeorefFromProject(
  project: CadProject,
  viewport?: { minX: number; maxX: number; minY: number; maxY: number },
): CadGeorefContext {
  return detectCadGeoref(project.entities, viewport, project.crs);
}

function boundsFromVerts(verts: CadVertex[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const v of verts) {
    minX = Math.min(minX, v.x);
    maxX = Math.max(maxX, v.x);
    minY = Math.min(minY, v.y);
    maxY = Math.max(maxY, v.y);
  }
  return { minX, maxX, minY, maxY };
}

export function vertexToEn(v: CadVertex, georef: CadGeorefContext): { e: number; n: number } {
  return { e: v[georef.eastingAxis], n: v[georef.northingAxis] };
}

export function enToVertex(e: number, n: number, z: number, georef: CadGeorefContext): CadVertex {
  const v: CadVertex = { x: 0, y: 0, z };
  v[georef.eastingAxis] = e;
  v[georef.northingAxis] = n;
  return v;
}

export function enToLatLonGeoref(e: number, n: number, georef: CadGeorefContext) {
  return enToLatLon(e, n, georef.utmZone);
}

export function latLonToVertexGeoref(lat: number, lon: number, z: number, georef: CadGeorefContext): CadVertex {
  const en = latLonToEn(lat, lon, georef.utmZone);
  return enToVertex(en.e, en.n, z, georef);
}

export function viewportBbox4326Georef(
  viewport: { minX: number; maxX: number; minY: number; maxY: number },
  georef: CadGeorefContext,
) {
  const corners = [
    { x: viewport.minX, y: viewport.minY },
    { x: viewport.maxX, y: viewport.minY },
    { x: viewport.maxX, y: viewport.maxY },
    { x: viewport.minX, y: viewport.maxY },
  ];

  const latLons = corners.map((c) => {
    const { e, n } = vertexToEn({ x: c.x, y: c.y, z: 0 }, georef);
    return enToLatLonGeoref(e, n, georef);
  });

  return {
    minLon: Math.min(...latLons.map((c) => c.lon)),
    minLat: Math.min(...latLons.map((c) => c.lat)),
    maxLon: Math.max(...latLons.map((c) => c.lon)),
    maxLat: Math.max(...latLons.map((c) => c.lat)),
  };
}

export { formatSirgasUtmProjection } from "@/lib/rtk-validation/project-coords";
