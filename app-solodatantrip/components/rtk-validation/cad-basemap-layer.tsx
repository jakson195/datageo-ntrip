"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { worldToScreen, type CadViewport } from "@/lib/rtk-validation/cad/viewport";
import {
  detectCadGeoref,
  enToLatLonGeoref,
  latLonToVertexGeoref,
  vertexToEn,
  viewportBbox4326Georef,
  type CadGeorefContext,
} from "@/lib/rtk-validation/cad/georef";
import {
  latLonToTileXY,
  pickTileZoom,
  tileLatLonBounds,
  viewportScreenBounds,
  type MapTileRef,
} from "@/lib/rtk-validation/cad/map-tiles";
import type { CadEntity } from "@/lib/rtk-validation/cad/types";

export type CadBasemapOverlays = {
  satellite: boolean;
  car: boolean;
  anm: boolean;
  hidro: boolean;
};

type CadBasemapLayerProps = {
  viewport: CadViewport;
  entities: CadEntity[];
  overlays: CadBasemapOverlays;
  crs?: string;
  georef?: CadGeorefContext;
};

type OverlayKey = "car" | "anm" | "hidro";

const OVERLAY_CONFIG: Record<
  OverlayKey,
  { apiPath: string; opacity: number; zIndex: number }
> = {
  car: { apiPath: "/api/cad-map/car", opacity: 0.92, zIndex: 1 },
  anm: { apiPath: "/api/cad-map/anm", opacity: 0.88, zIndex: 2 },
  hidro: { apiPath: "/api/cad-map/hidro", opacity: 0.9, zIndex: 3 },
};

function rectToPercent(
  rect: { x: number; y: number; width: number; height: number },
  viewW: number,
  viewH: number,
) {
  return {
    left: `${(rect.x / viewW) * 100}%`,
    top: `${(rect.y / viewH) * 100}%`,
    width: `${(rect.width / viewW) * 100}%`,
    height: `${(rect.height / viewH) * 100}%`,
  };
}

function buildMapUrl(apiPath: string, bboxStr: string, w: number, h: number) {
  return `${apiPath}?bbox=${encodeURIComponent(bboxStr)}&width=${w}&height=${h}`;
}

function buildSatelliteTileUrl(tile: MapTileRef) {
  const params = new URLSearchParams({
    z: String(tile.z),
    x: String(tile.x),
    y: String(tile.y),
    source: "esri",
  });
  return `/api/cad-map/tile?${params.toString()}`;
}

function listSatelliteTiles(viewport: CadViewport, georef: CadGeorefContext, zoom: number): MapTileRef[] {
  const bbox = viewportBbox4326Georef(viewport, georef);
  const { x: x0, y: y0 } = latLonToTileXY(bbox.maxLat, bbox.minLon, zoom);
  const { x: x1, y: y1 } = latLonToTileXY(bbox.minLat, bbox.maxLon, zoom);
  const tiles: MapTileRef[] = [];
  const maxTiles = 48;
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
      tiles.push({ x, y, z: zoom });
      if (tiles.length >= maxTiles) return tiles;
    }
  }
  return tiles;
}

function tileScreenBoundsGeoref(
  tile: MapTileRef,
  viewport: CadViewport,
  georef: CadGeorefContext,
) {
  const bounds = tileLatLonBounds(tile.x, tile.y, tile.z);
  const nw = latLonToVertexGeoref(bounds.latMax, bounds.lonMin, 0, georef);
  const se = latLonToVertexGeoref(bounds.latMin, bounds.lonMax, 0, georef);
  const tl = worldToScreen(nw.x, nw.y, viewport);
  const br = worldToScreen(se.x, se.y, viewport);
  const x = Math.min(tl.sx, br.sx);
  const y = Math.min(tl.sy, br.sy);
  const width = Math.abs(br.sx - tl.sx);
  const height = Math.abs(br.sy - tl.sy);
  if (width < 1 || height < 1) return null;
  return { x, y, width, height };
}

function WmsOverlayImage({
  url,
  style,
  opacity,
  onFailed,
}: {
  url: string;
  style: React.CSSProperties;
  opacity: number;
  onFailed: () => void;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      draggable={false}
      className="absolute block max-w-none"
      style={{ ...style, objectFit: "fill", opacity }}
      onError={onFailed}
    />
  );
}

export function CadBasemapLayer({ viewport, entities, overlays, crs, georef: georefProp }: CadBasemapLayerProps) {
  const t = useTranslations("rtkCad.basemap");
  const [failed, setFailed] = useState<Record<OverlayKey, boolean>>({
    car: false,
    anm: false,
    hidro: false,
  });
  const [satelliteFailed, setSatelliteFailed] = useState(false);

  const activeKeys = (Object.keys(overlays) as OverlayKey[]).filter((k) => overlays[k]);

  useEffect(() => {
    if (activeKeys.length === 0 && !overlays.satellite) return;
    setFailed((prev) => {
      const next = { ...prev };
      for (const key of activeKeys) next[key] = false;
      return next;
    });
    if (overlays.satellite) setSatelliteFailed(false);
  }, [
    overlays.car,
    overlays.anm,
    overlays.hidro,
    overlays.satellite,
    viewport.minX,
    viewport.maxX,
    viewport.minY,
    viewport.maxY,
  ]);

  const georef = useMemo(
    () => georefProp ?? detectCadGeoref(entities, viewport, crs),
    [georefProp, entities, viewport.minX, viewport.maxX, viewport.minY, viewport.maxY, crs],
  );

  const mapUrls = useMemo(() => {
    if (!georef.isGeoreferenced) {
      return { car: null, anm: null, hidro: null };
    }
    const bbox = viewportBbox4326Georef(viewport, georef);
    const w = Math.min(1600, Math.max(512, Math.round(viewport.width * 2)));
    const h = Math.min(1600, Math.max(512, Math.round(viewport.height * 2)));
    const bboxStr = [bbox.minLon, bbox.minLat, bbox.maxLon, bbox.maxLat]
      .map((n) => n.toFixed(6))
      .join(",");

    return {
      car: overlays.car ? buildMapUrl(OVERLAY_CONFIG.car.apiPath, bboxStr, w, h) : null,
      anm: overlays.anm ? buildMapUrl(OVERLAY_CONFIG.anm.apiPath, bboxStr, w, h) : null,
      hidro: overlays.hidro ? buildMapUrl(OVERLAY_CONFIG.hidro.apiPath, bboxStr, w, h) : null,
    };
  }, [overlays, viewport, georef, entities]);

  const satelliteTiles = useMemo(() => {
    if (!overlays.satellite || !georef.isGeoreferenced) return [];
    const centerVertex = {
      x: (viewport.minX + viewport.maxX) / 2,
      y: (viewport.minY + viewport.maxY) / 2,
      z: 0,
    };
    const { e, n } = vertexToEn(centerVertex, georef);
    const center = enToLatLonGeoref(e, n, georef);
    const zoom = pickTileZoom(viewport, center.lat);
    return listSatelliteTiles(viewport, georef, zoom)
      .map((tile) => ({
        tile,
        bounds: tileScreenBoundsGeoref(tile, viewport, georef),
        url: buildSatelliteTileUrl(tile),
      }))
      .filter((item): item is { tile: MapTileRef; bounds: { x: number; y: number; width: number; height: number }; url: string } =>
        item.bounds != null,
      );
  }, [overlays.satellite, viewport, georef]);

  if (!overlays.car && !overlays.anm && !overlays.hidro && !overlays.satellite) return null;

  const viewW = viewport.width;
  const viewH = viewport.height;
  const wmsStyle = rectToPercent(viewportScreenBounds(viewport, worldToScreen), viewW, viewH);

  return (
    <div
      className="cad-basemap pointer-events-none absolute inset-0 overflow-hidden"
      style={{ background: overlays.satellite ? "#1a1a1a" : "#e8eef4" }}
      aria-hidden
    >
      {overlays.satellite && georef.isGeoreferenced
        ? satelliteTiles.map(({ tile, bounds, url }) => {
            const style = rectToPercent(bounds, viewW, viewH);
            return (
              <WmsOverlayImage
                key={`sat-${tile.z}-${tile.x}-${tile.y}`}
                url={url}
                style={{ ...style, zIndex: 0 }}
                opacity={1}
                onFailed={() => setSatelliteFailed(true)}
              />
            );
          })
        : null}

      {overlays.satellite && !georef.isGeoreferenced ? (
        <div
          className="absolute left-2 top-2 z-20 rounded bg-amber-600/90 px-2 py-1 text-[10px] text-white"
          style={{ pointerEvents: "none" }}
        >
          {t("needGeoref")}
        </div>
      ) : null}

      {overlays.satellite && georef.isGeoreferenced && satelliteFailed ? (
        <div
          className="absolute left-2 top-2 z-20 rounded bg-amber-600/90 px-2 py-1 text-[10px] text-white"
          style={{ pointerEvents: "none" }}
        >
          {t("satelliteUnavailable")}
        </div>
      ) : null}

      {(Object.keys(OVERLAY_CONFIG) as OverlayKey[]).map((key) => {
        if (!overlays[key] || !mapUrls[key] || failed[key] || !georef.isGeoreferenced) return null;
        const cfg = OVERLAY_CONFIG[key];
        return (
          <WmsOverlayImage
            key={key}
            url={mapUrls[key]!}
            style={{ ...wmsStyle, zIndex: cfg.zIndex }}
            opacity={cfg.opacity}
            onFailed={() => setFailed((prev) => ({ ...prev, [key]: true }))}
          />
        );
      })}

      {(Object.keys(OVERLAY_CONFIG) as OverlayKey[]).map((key) => {
        if (!overlays[key] || !failed[key]) return null;
        return (
          <div
            key={`${key}-err`}
            className="absolute rounded bg-amber-600/90 px-2 py-1 text-[10px] text-white"
            style={{
              pointerEvents: "none",
              left: key === "car" ? 8 : key === "anm" ? 8 : 8,
              top: key === "car" ? 8 : key === "anm" ? 28 : 48,
              zIndex: 20,
            }}
          >
            {t(`${key}Unavailable`)}
          </div>
        );
      })}
    </div>
  );
}

export function CadBasemapAttribution({ overlays }: { overlays: CadBasemapOverlays }) {
  const t = useTranslations("rtkCad.basemap");
  const labels: string[] = [];
  if (overlays.satellite) labels.push(t("satelliteCredit"));
  if (overlays.car) labels.push(t("carCredit"));
  if (overlays.anm) labels.push(t("anmCredit"));
  if (overlays.hidro) labels.push(t("hidroCredit"));
  if (labels.length === 0) return null;

  return (
    <div className="pointer-events-none absolute bottom-10 right-2 z-20 max-w-[280px] rounded bg-black/60 px-2 py-1 text-[9px] leading-snug text-white/90">
      {labels.join(" · ")}
    </div>
  );
}
