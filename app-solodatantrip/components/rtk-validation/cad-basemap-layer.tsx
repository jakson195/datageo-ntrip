"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { worldToScreen, type CadViewport } from "@/lib/rtk-validation/cad/viewport";
import { detectCadGeoref, viewportBbox4326Georef } from "@/lib/rtk-validation/cad/georef";
import { viewportScreenBounds } from "@/lib/rtk-validation/cad/map-tiles";
import type { CadEntity } from "@/lib/rtk-validation/cad/types";

export type CadBasemapOverlays = {
  car: boolean;
  anm: boolean;
  hidro: boolean;
};

type CadBasemapLayerProps = {
  viewport: CadViewport;
  entities: CadEntity[];
  overlays: CadBasemapOverlays;
  crs?: string;
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

export function CadBasemapLayer({ viewport, entities, overlays, crs }: CadBasemapLayerProps) {
  const t = useTranslations("rtkCad.basemap");
  const [failed, setFailed] = useState<Record<OverlayKey, boolean>>({
    car: false,
    anm: false,
    hidro: false,
  });

  const activeKeys = (Object.keys(overlays) as OverlayKey[]).filter((k) => overlays[k]);

  useEffect(() => {
    if (activeKeys.length === 0) return;
    setFailed((prev) => {
      const next = { ...prev };
      for (const key of activeKeys) next[key] = false;
      return next;
    });
  }, [
    overlays.car,
    overlays.anm,
    overlays.hidro,
    viewport.minX,
    viewport.maxX,
    viewport.minY,
    viewport.maxY,
  ]);

  const georef = useMemo(
    () => detectCadGeoref(entities, viewport, crs),
    [entities, viewport.minX, viewport.maxX, viewport.minY, viewport.maxY, crs],
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

  const viewportRect = useMemo(
    () => viewportScreenBounds(viewport, worldToScreen),
    [viewport],
  );

  if (!overlays.car && !overlays.anm && !overlays.hidro) return null;

  const viewW = viewport.width;
  const viewH = viewport.height;
  const baseStyle = rectToPercent(viewportRect, viewW, viewH);

  return (
    <div
      className="cad-basemap pointer-events-none absolute inset-0 overflow-hidden"
      style={{ background: "#e8eef4" }}
      aria-hidden
    >
      {(Object.keys(OVERLAY_CONFIG) as OverlayKey[]).map((key) => {
        if (!overlays[key] || !mapUrls[key] || failed[key]) return null;
        const cfg = OVERLAY_CONFIG[key];
        return (
          <WmsOverlayImage
            key={key}
            url={mapUrls[key]!}
            style={{ ...baseStyle, zIndex: cfg.zIndex }}
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
