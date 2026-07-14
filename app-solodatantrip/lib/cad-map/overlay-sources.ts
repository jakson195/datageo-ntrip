/** Fontes oficiais de mapas de referência para o ambiente CAD. */

import type { Bbox4326 } from "./fetch-map-image";

export const CAR_WMS_BASE = "https://geoserver.car.gov.br/geoserver/sicar/wms";

/** Centróides aproximados (WGS84) para escolher a camada sicar_imoveis_XX. */
const BRAZIL_UF_CENTROIDS: Record<string, { lon: number; lat: number }> = {
  ac: { lon: -70.5, lat: -9.0 },
  al: { lon: -36.5, lat: -9.5 },
  am: { lon: -64.0, lat: -4.0 },
  ap: { lon: -51.5, lat: 1.0 },
  ba: { lon: -41.5, lat: -12.5 },
  ce: { lon: -39.5, lat: -5.0 },
  df: { lon: -47.9, lat: -15.8 },
  es: { lon: -40.5, lat: -19.5 },
  go: { lon: -49.5, lat: -16.0 },
  ma: { lon: -45.0, lat: -5.0 },
  mg: { lon: -44.5, lat: -18.5 },
  ms: { lon: -54.5, lat: -20.5 },
  mt: { lon: -55.0, lat: -12.5 },
  pa: { lon: -52.0, lat: -4.0 },
  pb: { lon: -36.5, lat: -7.0 },
  pe: { lon: -37.5, lat: -8.5 },
  pi: { lon: -42.5, lat: -7.0 },
  pr: { lon: -51.0, lat: -24.5 },
  rj: { lon: -43.0, lat: -22.5 },
  rn: { lon: -36.5, lat: -5.5 },
  ro: { lon: -63.0, lat: -11.0 },
  rr: { lon: -61.0, lat: 2.0 },
  rs: { lon: -53.0, lat: -30.0 },
  sc: { lon: -50.5, lat: -27.5 },
  se: { lon: -37.5, lat: -10.5 },
  sp: { lon: -48.0, lat: -22.0 },
  to: { lon: -48.0, lat: -10.0 },
};

export function detectCarUfFromBbox4326(bbox: Bbox4326): string {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const cx = (minLon + maxLon) / 2;
  const cy = (minLat + maxLat) / 2;
  let best = "sp";
  let bestDist = Infinity;
  for (const [uf, c] of Object.entries(BRAZIL_UF_CENTROIDS)) {
    const d = (cx - c.lon) ** 2 + (cy - c.lat) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = uf;
    }
  }
  return best;
}

export function rankCarUfsFromBbox4326(bbox: Bbox4326, limit = 3): string[] {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const cx = (minLon + maxLon) / 2;
  const cy = (minLat + maxLat) / 2;
  return Object.entries(BRAZIL_UF_CENTROIDS)
    .map(([uf, c]) => ({ uf, d: (cx - c.lon) ** 2 + (cy - c.lat) ** 2 }))
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map((x) => x.uf);
}

export function carWmsLayerForUf(uf: string): string {
  return `sicar:sicar_imoveis_${uf.toLowerCase()}`;
}

export const ANM_SIGMINE_MAPSERVER =
  "https://geo.anm.gov.br/arcgis/rest/services/SIGMINE/dados_anm/MapServer";

export const ANM_SIGMINE_WMS = `${ANM_SIGMINE_MAPSERVER.replace("/rest/", "/")}/WMSServer`;

/** Camada 0 — processos minerários ativos (ANM). */
export const ANM_SIGMINE_LAYER_ID = "0";
/** @deprecated use ANM_SIGMINE_LAYER_ID */
export const ANM_SIGMINE_LAYERS = ANM_SIGMINE_LAYER_ID;

export const ANM_QUERY_LAYER = `${ANM_SIGMINE_MAPSERVER}/0`;

export const HIDRO_BHO_MAPSERVER =
  "https://portal1.snirh.gov.br/server/rest/services/dados_abertos/Hidrografia/MapServer";

export const HIDRO_BHO_FALLBACK_MAPSERVER =
  "https://www.snirh.gov.br/arcgis/rest/services/AtlasAguasWMS/Hidrografia_Atlas/MapServer";

export const HIDRO_LAYER_ID = "0";
