import { NextRequest, NextResponse } from "next/server";
import {
  fetchArcGisExportMap,
  parseBbox4326,
  parseMapDimensions,
} from "@/lib/cad-map/fetch-map-image";
import {
  HIDRO_BHO_FALLBACK_MAPSERVER,
  HIDRO_BHO_MAPSERVER,
  HIDRO_LAYER_ID,
} from "@/lib/cad-map/overlay-sources";
import { isBboxInBrazil } from "@/lib/rtk-validation/cad/map-bbox";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const bbox = parseBbox4326(searchParams.get("bbox"));
  const { width, height } = parseMapDimensions(
    searchParams.get("width"),
    searchParams.get("height"),
  );

  if (!bbox) {
    return NextResponse.json({ error: "Parâmetro bbox inválido." }, { status: 400 });
  }

  const [minLon, minLat, maxLon, maxLat] = bbox;
  if (!isBboxInBrazil({ minLon, minLat, maxLon, maxLat })) {
    return NextResponse.json(
      { error: "Área fora do Brasil — ajuste o zoom ou importe pontos RTK." },
      { status: 400 },
    );
  }

  try {
    const candidates = [HIDRO_BHO_MAPSERVER, HIDRO_BHO_FALLBACK_MAPSERVER];
    for (const base of candidates) {
      const result = await fetchArcGisExportMap(base, HIDRO_LAYER_ID, bbox, width, height);
      if (result) {
        return new NextResponse(result.body, {
          headers: {
            "Content-Type": result.contentType,
            "Cache-Control": "public, max-age=300",
          },
        });
      }
    }

    return NextResponse.json(
      { error: "Serviço de hidrografia (ANA/SNIRH) indisponível nesta extensão." },
      { status: 502 },
    );
  } catch {
    return NextResponse.json({ error: "Falha ao consultar hidrografia ANA/SNIRH." }, { status: 502 });
  }
}
