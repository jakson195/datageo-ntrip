import type { Bbox4326 } from "@/lib/cad-map/fetch-map-image";
import {
  ANM_SIGMINE_LAYERS,
  type AnmSigmineLayerKey,
} from "@/lib/cad-map/anm-sigmine-layers";
import { createCadGeorefContext, type CadGeorefContext } from "./georef";
import { latLonToVertexGeoref } from "./georef";
import type { CadEntity, CadLayer, CadPolylineEntity, CadVertex } from "./types";

export type OverlayImportSource = "anm" | "hidro" | "sicar";

export const SICAR_CAD_LAYER: CadLayer = {
  id: "car_sicar",
  name: "CAR/SICAR",
  color: "#22c55e",
  visible: true,
  locked: true,
};

export function cadLayerForAnmKey(key: AnmSigmineLayerKey): CadLayer {
  const def = ANM_SIGMINE_LAYERS[key];
  return {
    id: def.cadLayerId,
    name: `ANM — ${def.label}`,
    color: def.color,
    visible: true,
    locked: true,
  };
}

export const OVERLAY_LAYER_DEFS: Record<OverlayImportSource, CadLayer> = {
  anm: {
    id: ANM_SIGMINE_LAYERS.processos.cadLayerId,
    name: "ANM SIGMINE",
    color: ANM_SIGMINE_LAYERS.processos.color,
    visible: true,
    locked: true,
  },
  hidro: {
    id: "hidro_cursos",
    name: "Cursos d'água",
    color: "#3b82f6",
    visible: true,
    locked: true,
  },
};

function newOverlayId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function defaultGeoref(utmZone = 23): CadGeorefContext {
  return createCadGeorefContext(utmZone);
}

function toVertex(lon: number, lat: number, z: number | undefined, georef: CadGeorefContext): CadVertex {
  return latLonToVertexGeoref(lat, lon, z ?? 0, georef);
}

function ringToVertices(coords: number[][], georef: CadGeorefContext): CadVertex[] {
  return coords.map(([lon, lat, z]) => toVertex(lon, lat, z, georef));
}

function lineToVertices(coords: number[][], georef: CadGeorefContext): CadVertex[] {
  return coords.map(([lon, lat, z]) => toVertex(lon, lat, z, georef));
}

function featureLabel(feature: GeoJSON.Feature): string | undefined {
  const props = feature.properties ?? {};
  if (typeof props.tema === "string" && props.tema.trim()) return props.tema.trim();
  if (typeof props.PROCESSO === "string" && props.PROCESSO.trim()) return props.PROCESSO.trim();
  if (typeof props.NOME === "string" && props.NOME.trim()) return props.NOME.trim();
  if (typeof props.DSProcesso === "string" && props.DSProcesso.trim()) return props.DSProcesso.trim();
  if (typeof props.name === "string" && props.name.trim()) return props.name.trim();
  return undefined;
}

function featureToEntities(
  feature: GeoJSON.Feature,
  layerId: string,
  idPrefix: string,
  georef: CadGeorefContext,
): CadEntity[] {
  const geom = feature.geometry;
  if (!geom) return [];
  const name = featureLabel(feature);

  if (geom.type === "Polygon") {
    const ring = geom.coordinates[0];
    if (!ring || ring.length < 3) return [];
    const vertices = ringToVertices(ring, georef);
    return [
      {
        id: newOverlayId(idPrefix),
        type: "polyline",
        layerId,
        vertices,
        closed: true,
        name,
      } satisfies CadPolylineEntity,
    ];
  }

  if (geom.type === "MultiPolygon") {
    return geom.coordinates.flatMap((poly) => {
      const ring = poly[0];
      if (!ring || ring.length < 3) return [];
      return [
        {
          id: newOverlayId(idPrefix),
          type: "polyline",
          layerId,
          vertices: ringToVertices(ring, georef),
          closed: true,
          name,
        } satisfies CadPolylineEntity,
      ];
    });
  }

  if (geom.type === "LineString") {
    const vertices = lineToVertices(geom.coordinates, georef);
    if (vertices.length < 2) return [];
    return [
      {
        id: newOverlayId(idPrefix),
        type: "polyline",
        layerId,
        vertices,
        closed: false,
        name,
      } satisfies CadPolylineEntity,
    ];
  }

  if (geom.type === "MultiLineString") {
    return geom.coordinates.flatMap((line) => {
      const vertices = lineToVertices(line, georef);
      if (vertices.length < 2) return [];
      return [
        {
          id: newOverlayId(idPrefix),
          type: "polyline",
          layerId,
          vertices,
          closed: false,
          name,
        } satisfies CadPolylineEntity,
      ];
    });
  }

  return [];
}

export function geoJsonToOverlayEntities(
  collection: GeoJSON.FeatureCollection,
  layerId: string,
  idPrefix: string,
  georef: CadGeorefContext | number = 23,
): CadEntity[] {
  const ctx = typeof georef === "number" ? defaultGeoref(georef) : georef;
  const entities: CadEntity[] = [];
  for (const feature of collection.features) {
    entities.push(...featureToEntities(feature, layerId, idPrefix, ctx));
  }
  return entities;
}

/** @deprecated use geoJsonToOverlayEntities with explicit layerId */
export function geoJsonToAnmOverlayEntities(
  collection: GeoJSON.FeatureCollection,
  source: OverlayImportSource,
  georef: CadGeorefContext | number = 23,
): CadEntity[] {
  const layerId = OVERLAY_LAYER_DEFS[source].id;
  const prefix = source === "anm" ? "anm" : "hid";
  return geoJsonToOverlayEntities(collection, layerId, prefix, georef);
}

export function mergeOverlayImport(
  projectLayers: CadLayer[],
  projectEntities: CadEntity[],
  layerDef: CadLayer,
  imported: CadEntity[],
): { layers: CadLayer[]; entities: CadEntity[] } {
  const hasLayer = projectLayers.some((l) => l.id === layerDef.id);
  const layers = hasLayer ? projectLayers : [...projectLayers, layerDef];
  const entities = [
    ...projectEntities.filter((e) => e.layerId !== layerDef.id),
    ...imported,
  ];
  return { layers, entities };
}

/** @deprecated use mergeOverlayImport with explicit layerDef */
export function mergeOverlayImportLegacy(
  projectLayers: CadLayer[],
  projectEntities: CadEntity[],
  source: OverlayImportSource,
  imported: CadEntity[],
): { layers: CadLayer[]; entities: CadEntity[] } {
  return mergeOverlayImport(projectLayers, projectEntities, OVERLAY_LAYER_DEFS[source], imported);
}

export function mergeAnmLayerImport(
  projectLayers: CadLayer[],
  projectEntities: CadEntity[],
  anmKey: AnmSigmineLayerKey,
  imported: CadEntity[],
): { layers: CadLayer[]; entities: CadEntity[] } {
  const layerDef = cadLayerForAnmKey(anmKey);
  return mergeOverlayImport(projectLayers, projectEntities, layerDef, imported);
}

export function bboxToEnvelopeJson(bbox: Bbox4326) {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return JSON.stringify({
    xmin: minLon,
    ymin: minLat,
    xmax: maxLon,
    ymax: maxLat,
    spatialReference: { wkid: 4326 },
  });
}

export async function queryArcGisGeoJson(
  queryLayerUrl: string,
  bbox: Bbox4326,
  outFields = "OBJECTID",
): Promise<GeoJSON.FeatureCollection | null> {
  const url = new URL(`${queryLayerUrl.replace(/\/$/, "")}/query`);
  url.searchParams.set("geometry", bboxToEnvelopeJson(bbox));
  url.searchParams.set("geometryType", "esriGeometryEnvelope");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("outSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("returnGeometry", "true");
  if (outFields) url.searchParams.set("outFields", outFields);
  url.searchParams.set("f", "geojson");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch(url.toString(), { signal: controller.signal, cache: "no-store" });
    if (!res.ok) return null;

    const data = (await res.json()) as GeoJSON.FeatureCollection & {
      error?: { message?: string };
    };
    if (data?.error) return null;
    if (!data || !Array.isArray(data.features)) return null;
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
