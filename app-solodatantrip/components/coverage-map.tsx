"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useId, useRef } from "react";
import maplibregl from "maplibre-gl";

const CACHE_KEY = "sdn_coverage_v2";
const CACHE_TTL = 6 * 60 * 60 * 1000;

type CoverageData = {
  coverage25?: GeoJSON.Feature;
  coverage100?: GeoJSON.Feature;
};

function getCache(): CoverageData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw) as { ts: number; data: CoverageData };
    return Date.now() - ts < CACHE_TTL ? data : null;
  } catch {
    return null;
  }
}

function setCache(data: CoverageData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* ignore quota */
  }
}

function lighten(hex: string, pct: number) {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const t = pct / 100;
  const lr = Math.round(r + (255 - r) * t);
  const lg = Math.round(g + (255 - g) * t);
  const lb = Math.round(b + (255 - b) * t);
  return `#${[lr, lg, lb].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function darken(hex: string, pct: number) {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const t = pct / 100;
  const lr = Math.round(r * (1 - t));
  const lg = Math.round(g * (1 - t));
  const lb = Math.round(b * (1 - t));
  return `#${[lr, lg, lb].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

type CoverageMapProps = {
  compact?: boolean;
};

export function CoverageMap({ compact = false }: CoverageMapProps) {
  const uid = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const baseAccent = "#00c2a8";
    const fill2 = darken(baseAccent, 8);
    const fill10 = lighten(baseAccent, 12);
    const legendColor = lighten(baseAccent, 18);

    const baseDarkNoLabels: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        darknl: {
          type: "raster",
          tiles: [
            "https://basemaps.cartocdn.com/rastertiles/dark_nolabels/{z}/{x}/{y}.png",
            "https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
            "https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
            "https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
          ],
          tileSize: 256,
          attribution: "© OpenStreetMap, © CARTO",
        },
      },
      layers: [{ id: "darknl", type: "raster", source: "darknl" }],
    };

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: baseDarkNoLabels,
      center: [-54, -14],
      zoom: compact ? 3 : 3.5,
      renderWorldCopies: false,
    });
    mapRef.current = map;

    const addLabelOverlay = () => {
      if (map.getSource("labels")) return;
      map.addSource("labels", {
        type: "raster",
        tiles: [
          "https://basemaps.cartocdn.com/rastertiles/dark_only_labels/{z}/{x}/{y}.png",
          "https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png",
          "https://c.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
      });
      map.addLayer({
        id: "labels",
        type: "raster",
        source: "labels",
        paint: { "raster-opacity": 1 },
      });
    };

    const setPill = (cls: string, txt: string) => {
      if (!pillRef.current) return;
      pillRef.current.className = `pill ${cls}`;
      pillRef.current.textContent = txt;
    };

    const levelAt = (lngLat: maplibregl.LngLatLike) => {
      try {
        const p = map.project(lngLat as maplibregl.LngLat);
        if (map.queryRenderedFeatures(p, { layers: ["c25-fill"] }).length) return "2";
        if (map.queryRenderedFeatures(p, { layers: ["c100-fill"] }).length) return "10";
      } catch {
        /* layers not ready */
      }
      return "0";
    };

    const showLevel = (l: string) => {
      if (l === "2") setPill("ok", "≈ 2 cm neste ponto");
      else if (l === "10") setPill("warn", "≈ 10 cm neste ponto");
      else setPill("no", "Sem cobertura aqui");
    };

    const draw = (d: CoverageData) => {
      if (d.coverage100 && !map.getSource("c100")) {
        map.addSource("c100", { type: "geojson", data: d.coverage100 });
        map.addLayer({
          id: "c100-fill",
          type: "fill",
          source: "c100",
          paint: { "fill-color": fill10, "fill-opacity": 0.3 },
        });
        map.addLayer({
          id: "c100-line",
          type: "line",
          source: "c100",
          paint: { "line-color": fill10, "line-opacity": 0.45, "line-width": 1 },
        });
      }
      if (d.coverage25 && !map.getSource("c25")) {
        map.addSource("c25", { type: "geojson", data: d.coverage25 });
        map.addLayer({
          id: "c25-fill",
          type: "fill",
          source: "c25",
          paint: { "fill-color": fill2, "fill-opacity": 0.55 },
        });
        map.addLayer({
          id: "c25-line",
          type: "line",
          source: "c25",
          paint: { "line-color": fill2, "line-opacity": 0.75, "line-width": 1 },
        });
      }
      addLabelOverlay();
      if (map.getLayer("labels")) map.moveLayer("labels");
    };

    const update = (d: CoverageData) => {
      const s100 = map.getSource("c100") as maplibregl.GeoJSONSource | undefined;
      const s25 = map.getSource("c25") as maplibregl.GeoJSONSource | undefined;
      if (s100 && d.coverage100) s100.setData(d.coverage100);
      if (s25 && d.coverage25) s25.setData(d.coverage25);
      if (map.getLayer("labels")) map.moveLayer("labels");
    };

    const fetchCoverage = async () => {
      const r = await fetch("/api/coverage", { headers: { Accept: "application/json" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      return (j.data ?? j) as CoverageData;
    };

    markerRef.current = new maplibregl.Marker({ color: fill2 });

    map.on("styledata", () => {
      if (map.isStyleLoaded()) addLabelOverlay();
    });

    map.on("load", async () => {
      const cached = getCache();
      if (cached) draw(cached);
      try {
        const fresh = await fetchCoverage();
        setCache(fresh);
        if (!cached) draw(fresh);
        else update(fresh);
      } catch {
        if (!cached) setPill("no", "Mapa indisponível");
      }
    });

    map.on("click", (e) => {
      markerRef.current?.setLngLat(e.lngLat).addTo(map);
      showLevel(levelAt(e.lngLat));
    });

    const parseCoords = (s: string): [number, number] | null => {
      const m = s.trim().match(/^\s*(-?\d+(\.\d+)?)\s*[, ]\s*(-?\d+(\.\d+)?)\s*$/);
      if (!m) return null;
      const a = parseFloat(m[1]);
      const b = parseFloat(m[3]);
      return Math.abs(a) <= 90 ? [b, a] : [a, b];
    };

    const nominatim = async (q: string) => {
      const url = `https://nominatim.openstreetmap.org/search?format=geojson&limit=6&accept-language=pt-BR&q=${encodeURIComponent(q)}`;
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      if (!r.ok) throw new Error("search failed");
      return r.json() as Promise<GeoJSON.FeatureCollection>;
    };

    const showList = (items: { label: string; center: [number, number] }[]) => {
      const list = listRef.current;
      if (!list) return;
      list.innerHTML = "";
      if (!items.length) {
        list.style.display = "none";
        return;
      }
      items.forEach((it) => {
        const d = document.createElement("div");
        d.className = "sdn-item";
        d.textContent = it.label;
        d.onclick = () => select(it.center);
        list.appendChild(d);
      });
      list.style.display = "block";
    };

    const select = (center: [number, number]) => {
      if (listRef.current) listRef.current.style.display = "none";
      markerRef.current?.setLngLat(center).addTo(map);
      map.flyTo({ center, zoom: 12, speed: 1.2 });
      const after = () => {
        showLevel(levelAt(center));
        map.off("moveend", after);
      };
      map.on("moveend", after);
    };

    let deb: ReturnType<typeof setTimeout> | null = null;
    const runSearch = async () => {
      const input = inputRef.current;
      if (!input) return;
      const s = input.value.trim();
      if (!s) {
        if (listRef.current) listRef.current.style.display = "none";
        return;
      }
      const c = parseCoords(s);
      if (c) {
        showList([{ label: `${c[1].toFixed(5)}, ${c[0].toFixed(5)}`, center: c }]);
        return;
      }
      try {
        const g = await nominatim(s);
        const items = (g.features ?? []).map((f) => ({
          label: (f.properties as { display_name?: string })?.display_name ?? "Local",
          center: (f.geometry as GeoJSON.Point).coordinates as [number, number],
        }));
        showList(items);
      } catch {
        showList([]);
      }
    };

    const input = inputRef.current;
    const onInput = () => {
      if (deb) clearTimeout(deb);
      deb = setTimeout(runSearch, 250);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        runSearch();
      }
      if (e.key === "Escape" && listRef.current) listRef.current.style.display = "none";
    };
    const onDocClick = (e: MouseEvent) => {
      const list = listRef.current;
      if (!list || !input) return;
      if (!list.contains(e.target as Node) && e.target !== input) {
        list.style.display = "none";
      }
    };

    input?.addEventListener("input", onInput);
    input?.addEventListener("keydown", onKey);
    document.addEventListener("click", onDocClick);

    const dot2 = document.getElementById(`${uid}-dot-2cm`);
    const dot10 = document.getElementById(`${uid}-dot-10cm`);
    if (dot2) dot2.style.backgroundColor = legendColor;
    if (dot10) {
      const m = legendColor.replace("#", "");
      const r = parseInt(m.slice(0, 2), 16);
      const g = parseInt(m.slice(2, 4), 16);
      const b = parseInt(m.slice(4, 6), 16);
      dot10.style.backgroundColor = `rgba(${r},${g},${b},0.5)`;
    }

    const zoomIn = document.getElementById(`${uid}-zoom-in`);
    const zoomOut = document.getElementById(`${uid}-zoom-out`);
    zoomIn?.addEventListener("click", () => map.zoomIn({ duration: 160 }));
    zoomOut?.addEventListener("click", () => map.zoomOut({ duration: 160 }));

    return () => {
      input?.removeEventListener("input", onInput);
      input?.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onDocClick);
      map.remove();
      mapRef.current = null;
    };
  }, [compact, uid]);

  const heightClass = compact ? "h-[420px] min-h-[420px]" : "h-[min(72vh,640px)] min-h-[420px]";

  return (
    <div className={`sdn-cov relative overflow-hidden rounded-xl border border-card-border ${heightClass}`}>
      <div ref={containerRef} className="absolute inset-0 bg-[#0b1220]" />

      <div className="sdn-search pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-3">
        <div className="pointer-events-auto w-full max-w-lg">
          <div className="flex items-center gap-2 rounded-full border border-card-border bg-white px-4 py-2.5 shadow-lg">
            <span className="sdn-icon h-[18px] w-[18px] shrink-0 opacity-70" aria-hidden />
            <input
              ref={inputRef}
              type="text"
              placeholder="Cidade, CEP ou coordenadas (-23.55, -46.63)"
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-500"
              autoComplete="off"
            />
          </div>
          <div
            ref={listRef}
            className="sdn-sugg mt-2 hidden max-h-48 overflow-auto rounded-xl border border-card-border bg-card shadow-xl"
          />
        </div>
      </div>

      <div className="absolute left-3 top-14 z-10 rounded-lg border border-card-border bg-card/95 px-3 py-2 text-xs font-semibold text-foreground backdrop-blur-sm sm:top-3">
        Cobertura:{" "}
        <span ref={pillRef} className="pill warn ml-1">
          clique no mapa
        </span>
      </div>

      <div className="absolute right-3 top-3 z-10 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs text-white backdrop-blur-md">
        <p className="mb-1 font-bold">Precisão RTK</p>
        <p className="flex items-center gap-2">
          <span id={`${uid}-dot-2cm`} className="h-3.5 w-3.5 rounded-full border border-white/20" /> 2 cm
        </p>
        <p className="mt-1 flex items-center gap-2">
          <span id={`${uid}-dot-10cm`} className="h-3.5 w-3.5 rounded-full border border-white/20" /> 10 cm
        </p>
      </div>

      <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-3">
        <button
          id={`${uid}-zoom-in`}
          type="button"
          aria-label="Aproximar"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-card-border bg-card text-foreground hover:border-accent hover:bg-accent/20"
        >
          +
        </button>
        <button
          id={`${uid}-zoom-out`}
          type="button"
          aria-label="Afastar"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-card-border bg-card text-foreground hover:border-accent hover:bg-accent/20"
        >
          −
        </button>
      </div>

      <p className="absolute bottom-2 right-3 z-10 text-[10px] text-white/50">
        Dados: Geodnet / RTK Data
      </p>

    </div>
  );
}
