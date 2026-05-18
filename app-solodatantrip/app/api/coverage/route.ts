const COVERAGE_API = "https://rtk.geodnet.com/api/v2/coverage";

export async function GET() {
  const res = await fetch(COVERAGE_API, {
    headers: { Accept: "application/json" },
    next: { revalidate: 6 * 60 * 60 },
  });

  if (!res.ok) {
    return Response.json(
      { code: -1, msg: "Falha ao carregar cobertura", data: null },
      { status: 502 }
    );
  }

  const json = await res.json();
  return Response.json(json, {
    headers: {
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=3600",
    },
  });
}
