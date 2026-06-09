import "server-only";

export type GnssBrand =
  | "emlid"
  | "comnav"
  | "chnav"
  | "topcon"
  | "hitarget"
  | "south"
  | "leica"
  | "trimble"
  | "generic";

export interface GnssConfigPayload {
  host: string;
  port: string;
  username: string;
  password: string;
  mountpoint: string;
}

export interface GnssProviderAdapter {
  readonly brand: GnssBrand;
  formatCredentials(creds: GnssConfigPayload): string;
  parseQrPayload(raw: string): GnssConfigPayload | null;
}

/** Formato NTRIP genérico — compatível com Emlid Flow, SurPad, Carlson, Lefebure, SW Maps */
export class GenericNtripAdapter implements GnssProviderAdapter {
  readonly brand: GnssBrand = "generic";

  formatCredentials(c: GnssConfigPayload): string {
    return [
      "NTRIP",
      `Host=${c.host}`,
      `Port=${c.port}`,
      `User=${c.username}`,
      `Password=${c.password}`,
      `Mountpoint=${c.mountpoint}`,
    ].join("\n");
  }

  parseQrPayload(raw: string): GnssConfigPayload | null {
    try {
      const json = JSON.parse(raw) as GnssConfigPayload;
      if (json.host && json.username) return json;
    } catch {
      // linha por linha
    }
    const lines = raw.split("\n");
    const map: Record<string, string> = {};
    for (const line of lines) {
      const [k, v] = line.split("=");
      if (k && v) map[k.trim().toLowerCase()] = v.trim();
    }
    if (!map.host) return null;
    return {
      host: map.host,
      port: map.port ?? "2101",
      username: map.user ?? map.username ?? "",
      password: map.password ?? "",
      mountpoint: map.mountpoint ?? "AUTO",
    };
  }
}

export class EmlidAdapter extends GenericNtripAdapter {
  readonly brand: GnssBrand = "emlid";

  formatCredentials(c: GnssConfigPayload): string {
    return JSON.stringify({
      type: "ntrip",
      caster: c.host,
      port: Number(c.port),
      username: c.username,
      password: c.password,
      mountpoint: c.mountpoint,
    });
  }
}

export class ComNavAdapter extends GenericNtripAdapter {
  readonly brand: GnssBrand = "comnav";
}

export class ChcNavAdapter extends GenericNtripAdapter {
  readonly brand: GnssBrand = "chnav";
}

export class TopconAdapter extends GenericNtripAdapter {
  readonly brand: GnssBrand = "topcon";
}

export class HiTargetAdapter extends GenericNtripAdapter {
  readonly brand: GnssBrand = "hitarget";
}

export class SouthAdapter extends GenericNtripAdapter {
  readonly brand: GnssBrand = "south";
}

export class LeicaAdapter extends GenericNtripAdapter {
  readonly brand: GnssBrand = "leica";
}

export class TrimbleAdapter extends GenericNtripAdapter {
  readonly brand: GnssBrand = "trimble";
}

const adapters: GnssProviderAdapter[] = [
  new EmlidAdapter(),
  new ComNavAdapter(),
  new ChcNavAdapter(),
  new TopconAdapter(),
  new HiTargetAdapter(),
  new SouthAdapter(),
  new LeicaAdapter(),
  new TrimbleAdapter(),
  new GenericNtripAdapter(),
];

export function getGnssAdapter(brand: GnssBrand): GnssProviderAdapter {
  return adapters.find((a) => a.brand === brand) ?? new GenericNtripAdapter();
}

export { adapters as gnssAdapters };
