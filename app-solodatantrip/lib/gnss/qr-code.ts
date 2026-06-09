import "server-only";

import QRCode from "qrcode";
import type { GnssBrand, GnssConfigPayload } from "@/lib/gnss/providers";
import { getGnssAdapter } from "@/lib/gnss/providers";

export interface GnssQrResult {
  payload: string;
  qrCodeDataUrl: string;
  brand: GnssBrand;
  credentials: GnssConfigPayload;
}

export async function generateGnssQrCode(
  credentials: GnssConfigPayload,
  brand: GnssBrand = "generic",
): Promise<GnssQrResult> {
  const adapter = getGnssAdapter(brand);
  const payload = adapter.formatCredentials(credentials);

  const qrCodeDataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
  });

  return { payload, qrCodeDataUrl, brand, credentials };
}

export function buildGnssJsonPayload(credentials: GnssConfigPayload): string {
  return JSON.stringify({
    host: credentials.host,
    port: credentials.port,
    username: credentials.username,
    password: credentials.password,
    mountpoint: credentials.mountpoint,
  });
}
