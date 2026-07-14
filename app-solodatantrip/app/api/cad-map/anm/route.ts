import { NextRequest, NextResponse } from "next/server";
import {
  fetchArcGisExportMap,
  fetchArcGisWmsMap,
  parseBbox4326,
  parseMapDimensions,
} from "@/lib/cad-map/fetch-map-image";
import {
  ANM_SIGMINE_LAYER_ID,
  ANM_SIGMINE_MAPSERVER,
  ANM_SIGMINE_WMS,
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
    const exportResult = await fetchArcGisExportMap(
      ANM_SIGMINE_MAPSERVER,
      ANM_SIGMINE_LAYER_ID,
      bbox,
      width,
      height,
    );
    if (exportResult) {
      return new NextResponse(exportResult.body, {
        headers: {
          "Content-Type": exportResult.contentType,
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    const wmsResult = await fetchArcGisWmsMap(ANM_SIGMINE_WMS, ANM_SIGMINE_LAYER_ID, bbox, width, height);
    if (wmsResult) {
      return new NextResponse(wmsResult.body, {
        headers: {
          "Content-Type": wmsResult.contentType,
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    return NextResponse.json(
      { error: "Serviço ANM/SIGMINE indisponível nesta extensão." },
      { status: 502 },
    );
  } catch {
    return NextResponse.json({ error: "Falha ao consultar ANM/SIGMINE." }, { status: 502 });
  }
}
