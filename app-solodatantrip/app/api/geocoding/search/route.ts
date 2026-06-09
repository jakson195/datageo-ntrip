import { NO_STORE_HEADERS, noStoreFetch } from "@/lib/http";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
export const runtime = "nodejs";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

const MAX_LIMIT = 10;
const DEFAULT_LIMIT = 6;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(searchParams.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT),
  );
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0) || 0);

  if (q.length < 2) {
    return Response.json(
      { type: "FeatureCollection", features: [] },
      { headers: NO_STORE_HEADERS },
    );
  }

  const url = new URL(NOMINATIM);
  url.searchParams.set("format", "geojson");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("accept-language", "pt-BR");
  url.searchParams.set("q", q);

  const res = await noStoreFetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "DataGeoNTrip/1.0 (coverage-map)",
    },
  });

  if (!res.ok) {
    return Response.json(
      { type: "FeatureCollection", features: [], error: "Falha na pesquisa" },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }

  const body = await res.text();
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...NO_STORE_HEADERS,
    },
  });
}
