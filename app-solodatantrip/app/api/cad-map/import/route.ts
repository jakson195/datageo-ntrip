import { NextRequest, NextResponse } from "next/server";
import { parseBbox4326 } from "@/lib/cad-map/fetch-map-image";
import {
  ANM_QUERY_LAYER,
  HIDRO_BHO_FALLBACK_MAPSERVER,
  HIDRO_BHO_MAPSERVER,
} from "@/lib/cad-map/overlay-sources";
import {
  geoJsonToOverlayEntities,
  type OverlayImportSource,
  queryArcGisGeoJson,
} from "@/lib/rtk-validation/cad/import-map-overlay";
import { isBboxInBrazil } from "@/lib/rtk-validation/cad/map-bbox";

const QUERY_LAYERS: Record<
  OverlayImportSource,
  { url: string; outFields: string }[]
> = {
  anm: [{ url: ANM_QUERY_LAYER, outFields: "PROCESSO,NOME,FASE,SUBS,UF" }],
  hidro: [
    { url: `${HIDRO_BHO_MAPSERVER}/0`, outFields: "OBJECTID" },
    { url: `${HIDRO_BHO_FALLBACK_MAPSERVER}/0`, outFields: "OBJECTID" },
  ],
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const source = searchParams.get("source") as OverlayImportSource | null;
  const bbox = parseBbox4326(searchParams.get("bbox"));
  const utmZoneRaw = Number(searchParams.get("utmZone"));
  const utmZone = Number.isFinite(utmZoneRaw) ? utmZoneRaw : 23;
  const swapEn = searchParams.get("swapEn") === "1";
  const georef = {
    utmZone,
    eastingAxis: swapEn ? ("y" as const) : ("x" as const),
    northingAxis: swapEn ? ("x" as const) : ("y" as const),
    isGeoreferenced: true,
  };

  if (source !== "anm" && source !== "hidro") {
    return NextResponse.json({ error: "Parâmetro source inválido (anm | hidro)." }, { status: 400 });
  }
  if (!bbox) {
    return NextResponse.json({ error: "Parâmetro bbox inválido." }, { status: 400 });
  }

  const [minLon, minLat, maxLon, maxLat] = bbox;
  if (!isBboxInBrazil({ minLon, minLat, maxLon, maxLat })) {
    return NextResponse.json(
      { error: "Área fora do Brasil — importe pontos RTK e use Enquadrar." },
      { status: 400 },
    );
  }

  const spanLon = maxLon - minLon;
  const spanLat = maxLat - minLat;
  if (spanLon > 1.2 || spanLat > 1.2) {
    return NextResponse.json(
      { error: "Área muito grande — aproxime o zoom antes de importar." },
      { status: 400 },
    );
  }

  try {
    const candidates = QUERY_LAYERS[source];
    let collection: GeoJSON.FeatureCollection | null = null;
    for (const candidate of candidates) {
      collection = await queryArcGisGeoJson(candidate.url, bbox, candidate.outFields);
      if (collection && collection.features.length > 0) break;
    }

    if (!collection || collection.features.length === 0) {
      return NextResponse.json(
        { error: "Nenhum dado encontrado na área visível.", features: 0, entities: [] },
        { status: 404 },
      );
    }

    const entities = geoJsonToOverlayEntities(collection, source, georef);
    if (entities.length === 0) {
      return NextResponse.json(
        { error: "Geometrias não suportadas nesta camada.", features: collection.features.length, entities: [] },
        { status: 422 },
      );
    }

    return NextResponse.json({
      source,
      features: collection.features.length,
      entities,
    });
  } catch {
    return NextResponse.json({ error: "Falha ao importar dados geoespaciais." }, { status: 502 });
  }
}
