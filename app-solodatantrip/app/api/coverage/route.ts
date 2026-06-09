import { unstable_noStore as noStore } from "next/cache";
import { isNextProductionBuild, NO_STORE_HEADERS } from "@/lib/http";
import type { CoverageApiPayload, CoverageLayer } from "@/lib/coverage-types";

const COVERAGE_API = "https://rtk.geodnet.com/api/v2/coverage";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
export const runtime = "nodejs";

function parseLayer(layer: string | null): CoverageLayer {
  if (layer === "25" || layer === "100") return layer;
  return "all";
}

function slicePayload(body: CoverageApiPayload, layer: CoverageLayer): CoverageApiPayload {
  const data = body.data;
  if (!data) return { code: body.code, msg: body.msg, data: undefined };
  if (layer === "all") return body;
  if (layer === "25") return { ...body, data: { coverage25: data.coverage25 } };
  return { ...body, data: { coverage100: data.coverage100 } };
}

function buildSkipPayload(layer: CoverageLayer): CoverageApiPayload {
  if (layer === "25") {
    return { code: 0, msg: "build-skip", data: { coverage25: undefined } };
  }
  if (layer === "100") {
    return { code: 0, msg: "build-skip", data: { coverage100: undefined } };
  }
  return { code: 0, msg: "build-skip", data: undefined };
}

export async function GET(request: Request) {
  noStore();

  const { searchParams } = new URL(request.url);
  const layer = parseLayer(searchParams.get("layer"));

  if (isNextProductionBuild()) {
    return Response.json(buildSkipPayload(layer), { headers: NO_STORE_HEADERS });
  }

  const res = await fetch(COVERAGE_API, {
    cache: "no-store",
    next: { revalidate: 0 },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    return Response.json(
      { code: -1, msg: "Falha ao carregar cobertura", data: null },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }

  const raw = await res.text();
  let parsed: CoverageApiPayload;
  try {
    parsed = JSON.parse(raw) as CoverageApiPayload;
  } catch {
    return Response.json(
      { code: -1, msg: "Resposta de cobertura inválida", data: null },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }

  const sliced = slicePayload(parsed, layer);
  return Response.json(sliced, { headers: NO_STORE_HEADERS });
}
