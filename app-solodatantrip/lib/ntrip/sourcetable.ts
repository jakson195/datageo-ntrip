export interface NtripBaseStation {
  mountpoint: string;
  identifier: string;
  network: string;
  country: string;
  latitude: number;
  longitude: number;
  navSystem: string;
  status: string;
}

export function parseNtripSourcetable(text: string): NtripBaseStation[] {
  const bases: NtripBaseStation[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("STR;")) continue;
    const parts = line.split(";");
    if (parts.length < 11) continue;

    const latitude = Number(parts[9]);
    const longitude = Number(parts[10]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    if (latitude === 0 && longitude === 0) continue;
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) continue;

    bases.push({
      mountpoint: parts[1]?.trim() || "—",
      identifier: parts[2]?.trim() || parts[1]?.trim() || "—",
      network: parts[7]?.trim() || "—",
      country: parts[8]?.trim() || "—",
      latitude,
      longitude,
      navSystem: parts[6]?.trim() || "—",
      status: "online",
    });
  }
  return bases;
}

export async function fetchNtripSourcetable(host: string, port = 2101): Promise<string> {
  const cleanHost = host.replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
  const url = `http://${cleanHost}:${port}/`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "NTRIP GNSSInternetRadio/1.0",
      "Ntrip-Version": "Ntrip/2.0",
    },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Sourcetable HTTP ${res.status}`);
  }
  return res.text();
}
