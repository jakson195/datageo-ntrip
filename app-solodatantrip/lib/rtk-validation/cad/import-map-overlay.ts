import type { Bbox4326 } from "@/lib/cad-map/fetch-map-image";
import { createCadGeorefContext, type CadGeorefContext } from "./georef";
import { latLonToVertexGeoref } from "./georef";
import type { CadEntity, CadLayer, CadPolylineEntity, CadVertex } from "./types";

export type OverlayImportSource = "anm" | "hidro";

export const OVERLAY_LAYER_DEFS: Record<OverlayImportSource, CadLayer> = {
  anm: {
    id: "anm_sigmine",
    name: "ANM SIGMINE",
    color: "#f97316",
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

function featureToEntities(
  feature: GeoJSON.Feature,
  source: OverlayImportSource,
  georef: CadGeorefContext,
): CadEntity[] {
  const layerId = OVERLAY_LAYER_DEFS[source].id;
  const geom = feature.geometry;
  if (!geom) return [];

  const name =
    typeof feature.properties?.PROCESSO === "string"
      ? feature.properties.PROCESSO
      : typeof feature.properties?.NOME === "string"
        ? feature.properties.NOME
        : typeof feature.properties?.name === "string"
          ? feature.properties.name
          : undefined;

  if (geom.type === "Polygon") {
    const ring = geom.coordinates[0];
    if (!ring || ring.length < 3) return [];
    const vertices = ringToVertices(ring, georef);
    return [
      {
        id: newOverlayId("anm"),
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
          id: newOverlayId("anm"),
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
        id: newOverlayId("hid"),
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
          id: newOverlayId("hid"),
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
  source: OverlayImportSource,
  georef: CadGeorefContext | number = 23,
): CadEntity[] {
  const ctx = typeof georef === "number" ? defaultGeoref(georef) : georef;
  const entities: CadEntity[] = [];
  for (const feature of collection.features) {
    entities.push(...featureToEntities(feature, source, ctx));
  }
  return entities;
}

export function mergeOverlayImport(
  projectLayers: CadLayer[],
  projectEntities: CadEntity[],
  source: OverlayImportSource,
  imported: CadEntity[],
): { layers: CadLayer[]; entities: CadEntity[] } {
  const layerDef = OVERLAY_LAYER_DEFS[source];
  const hasLayer = projectLayers.some((l) => l.id === layerDef.id);
  const layers = hasLayer ? projectLayers : [...projectLayers, layerDef];
  const entities = [
    ...projectEntities.filter((e) => e.layerId !== layerDef.id),
    ...imported,
  ];
  return { layers, entities };
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
