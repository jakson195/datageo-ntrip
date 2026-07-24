import { NextRequest, NextResponse } from "next/server";
import {
  fetchSicarImovelTemas,
  isSicarApiConfigured,
  normalizeCodigoImovel,
} from "@/lib/cad-map/sicar-api";
import { wktToGeoJson } from "@/lib/cad-map/wkt-to-geojson";
import {
  geoJsonToOverlayEntities,
  mergeOverlayImport,
  SICAR_CAD_LAYER,
} from "@/lib/rtk-validation/cad/import-map-overlay";
import { createCadGeorefContext } from "@/lib/rtk-validation/cad/georef";

/** Consulta temas do imóvel na API SICAR (ConectaGov). */
export async function GET(request: NextRequest) {
  const codigo = request.nextUrl.searchParams.get("codigo");
  if (!codigo?.trim()) {
    return NextResponse.json({ error: "Parâmetro codigo é obrigatório." }, { status: 400 });
  }

  if (!isSicarApiConfigured()) {
    return NextResponse.json(
      {
        error:
          "API SICAR não configurada. Defina SICAR_API_BEARER_TOKEN ou SICAR_CLIENT_ID + SICAR_CLIENT_SECRET no servidor.",
        configured: false,
      },
      { status: 503 },
    );
  }

  const result = await fetchSicarImovelTemas(codigo);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, configured: true }, { status: result.status });
  }

  const codigoImovel = normalizeCodigoImovel(codigo);
  const temas = (result.data.results ?? []).map((row) => ({
    tema: row.tema,
    identificadorImovel: row.identificadorImovel,
    areaTotalTema: row.areaTotalTema,
    hasGeometry: Boolean(row.poligonoAreaTema?.trim()),
  }));

  return NextResponse.json({
    codigoImovel,
    configured: true,
    temas,
    total: temas.length,
  });
}

/** Importa polígonos SICAR para entidades CAD. */
export async function POST(request: NextRequest) {
  let body: { codigo?: string; utmZone?: number; swapEn?: boolean; temas?: string[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const codigo = body.codigo?.trim();
  if (!codigo) {
    return NextResponse.json({ error: "Campo codigo é obrigatório." }, { status: 400 });
  }

  const utmZone = Number.isFinite(body.utmZone) ? Number(body.utmZone) : 23;
  const swapEn = body.swapEn === true;
  const georef = createCadGeorefContext(utmZone, swapEn ? "y" : "x", swapEn ? "x" : "y", true);
  const temaFilter = body.temas?.length ? new Set(body.temas) : null;

  const result = await fetchSicarImovelTemas(codigo);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const features: GeoJSON.Feature[] = [];
  for (const row of result.data.results ?? []) {
    if (temaFilter && !temaFilter.has(row.tema)) continue;
    const wkt = row.poligonoAreaTema?.trim();
    if (!wkt) continue;
    const geometry = wktToGeoJson(wkt);
    if (!geometry) continue;
    features.push({
      type: "Feature",
      properties: {
        tema: row.tema,
        NOME: row.tema,
        PROCESSO: codigo,
        AREA_HA: row.areaTotalTema,
      },
      geometry,
    });
  }

  if (features.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma geometria válida encontrada nos temas selecionados." },
      { status: 404 },
    );
  }

  const collection: GeoJSON.FeatureCollection = { type: "FeatureCollection", features };
  const entities = geoJsonToOverlayEntities(collection, SICAR_CAD_LAYER.id, "car", georef);

  return NextResponse.json({
    codigoImovel: normalizeCodigoImovel(codigo),
    features: features.length,
    entities,
    layer: SICAR_CAD_LAYER,
  });
}
