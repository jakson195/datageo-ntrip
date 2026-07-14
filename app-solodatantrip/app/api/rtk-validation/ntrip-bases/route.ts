import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchGeodnetCoverageNearby } from "@/lib/geodnet/rtk-api";
import { fetchNtripSourcetable, parseNtripSourcetable, type NtripBaseStation } from "@/lib/ntrip/sourcetable";
import { haversineKm } from "@/lib/rtk-validation/project-coords";

export const dynamic = "force-dynamic";

type BaseResponse = {
  mountpoint: string;
  identifier: string;
  network: string;
  country: string;
  latitude: number;
  longitude: number;
  navSystem: string;
  status: string;
  distanceKm: number;
  quality?: number;
};

function mapSourcetableBases(
  bases: NtripBaseStation[],
  lat: number,
  lon: number,
  radiusKm: number,
  limit: number,
): BaseResponse[] {
  return bases
    .map((base) => ({
      mountpoint: base.mountpoint,
      identifier: base.identifier,
      network: base.network,
      country: base.country,
      latitude: base.latitude,
      longitude: base.longitude,
      navSystem: base.navSystem,
      status: base.status,
      distanceKm: haversineKm(lat, lon, base.latitude, base.longitude),
    }))
    .filter((base) => base.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

export async function GET(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const radiusKm = Math.min(Number(searchParams.get("radius") ?? 250), 500);
  const limit = Math.min(Number(searchParams.get("limit") ?? 40), 100);

  const server = searchParams.get("server")?.trim() || user.ntrip.server;
  const port = Number(searchParams.get("port") ?? user.ntrip.port ?? 2101);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon required" }, { status: 400 });
  }

  try {
    let source: "geodnet-api" | "sourcetable" = "geodnet-api";
    let bases: BaseResponse[] = [];

    const geodnet = await fetchGeodnetCoverageNearby(lat, lon, {
      radiusKm: Math.min(radiusKm, 200),
      amount: limit,
    });

    if (geodnet && geodnet.length > 0) {
      bases = geodnet.map((station) => ({
        mountpoint: station.name,
        identifier: station.name,
        network: "GEODNET",
        country: "—",
        latitude: station.lat,
        longitude: station.lng,
        navSystem: "GNSS",
        status: station.status ?? "ACTIVE",
        distanceKm: station.distance,
        quality: station.quality,
      }));
    } else {
      source = "sourcetable";
      const raw = await fetchNtripSourcetable(server, port);
      bases = mapSourcetableBases(parseNtripSourcetable(raw), lat, lon, radiusKm, limit);
    }

    return NextResponse.json({
      server,
      port,
      source,
      center: { lat, lon },
      count: bases.length,
      bases,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load NTRIP bases";
    return NextResponse.json({ error: message, bases: [], source: "none" }, { status: 502 });
  }
}
