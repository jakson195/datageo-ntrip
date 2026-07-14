import { createHash } from "crypto";

const GEODNET_RTK_API = "https://rtk.geodnet.com/api/v3";

export type GeodnetCoverageStation = {
  name: string;
  distance: number;
  lat: number;
  lng: number;
  status?: string;
  quality?: number;
};

function geodnetSign(params: Record<string, string | number>, appKey: string) {
  const keys = Object.keys(params)
    .filter((k) => k !== "sign" && k !== "appKey")
    .sort();
  const payload = keys.map((k) => String(params[k])).join("") + appKey;
  return createHash("md5").update(payload).digest("hex");
}

export async function fetchGeodnetCoverageNearby(
  lat: number,
  lng: number,
  options?: { radiusKm?: number; amount?: number },
) {
  const appId = process.env.GEODNET_APP_ID?.trim();
  const appKey = process.env.GEODNET_APP_KEY?.trim();
  if (!appId || !appKey) return null;

  const time = Date.now();
  const body: Record<string, string | number> = {
    appId,
    lat,
    lng,
    radius: options?.radiusKm ?? 200,
    amount: options?.amount ?? 50,
    time,
  };
  body.sign = geodnetSign(body, appKey);

  const res = await fetch(`${GEODNET_RTK_API}/coverage/list`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });

  const json = (await res.json()) as {
    code?: number;
    msg?: string;
    data?: GeodnetCoverageStation[];
  };

  if (!res.ok || json.code !== 1000 || !Array.isArray(json.data)) {
    throw new Error(json.msg ?? `Geodnet API HTTP ${res.status}`);
  }

  return json.data;
}
