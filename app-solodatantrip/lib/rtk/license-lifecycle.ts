import "server-only";

import { noStoreFetch } from "@/lib/http";
import { getRtkConfig } from "./config";
import { logRtkError } from "./logger";

export type RtkLicenseAction = "cancel" | "suspend" | "reactivate";

export function isRemoteRtkLicense(licenseId: string): boolean {
  const id = licenseId.trim();
  return id.length > 0 && !id.startsWith("local-");
}

function licenseActionUrl(licenseId: string, action: RtkLicenseAction): string {
  const base = getRtkConfig().apiBaseUrl.replace(/\/$/, "");
  return `${base}/licenses/${encodeURIComponent(licenseId)}/${action}`;
}

export async function callRtkLicenseAction(
  licenseId: string,
  action: RtkLicenseAction,
  reason?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isRemoteRtkLicense(licenseId)) {
    return { ok: true };
  }

  const config = getRtkConfig();
  if (!config.apiKey) {
    return { ok: false, error: "API RTK não configurada." };
  }

  const url = licenseActionUrl(licenseId, action);

  try {
    const response = await noStoreFetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reason ? { reason } : {}),
      signal: AbortSignal.timeout(30_000),
    });

    if (response.ok) return { ok: true };

    let detail = "";
    try {
      const body = (await response.json()) as { error?: string; message?: string };
      detail = body.error || body.message || "";
    } catch {
      detail = await response.text().catch(() => "");
    }

    logRtkError({
      event: `license.${action}_failed`,
      message: `Falha ao ${action} licença RTK.`,
      httpStatus: response.status,
      detail: detail || licenseId,
    });

    return {
      ok: false,
      error: detail || `Não foi possível ${action} a licença RTK (HTTP ${response.status}).`,
    };
  } catch (error) {
    logRtkError({
      event: `license.${action}_network_error`,
      message: `Erro de rede ao ${action} licença RTK.`,
      detail: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: "Falha de rede ao contactar API RTK." };
  }
}

export async function cancelRemoteRtkLicense(
  licenseId: string,
  reason?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return callRtkLicenseAction(licenseId, "cancel", reason);
}

export async function suspendRemoteRtkLicense(
  licenseId: string,
  reason?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return callRtkLicenseAction(licenseId, "suspend", reason);
}

export async function reactivateRemoteRtkLicense(
  licenseId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return callRtkLicenseAction(licenseId, "reactivate");
}
