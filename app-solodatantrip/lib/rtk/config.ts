import "server-only";

export type RtkEnvironment = "sandbox" | "production";

const DEFAULT_API_BASE_URL = "https://rtkdata-reseller-1.onrender.com/api/v1";

function resolveEnvironment(): RtkEnvironment {
  const raw = process.env.RTK_API_MODE?.trim().toLowerCase();
  if (raw === "production" || raw === "prod") return "production";
  return "sandbox";
}

function resolveApiBaseUrl(): string {
  const explicitBase = process.env.RTK_API_BASE_URL?.trim();
  if (explicitBase) return explicitBase.replace(/\/$/, "");

  const legacyUrl =
    process.env.RTK_API_URL?.trim() ||
    process.env.RTK_API_URL_PRODUCTION?.trim() ||
    process.env.RTK_RESELLER_API_URL?.trim();

  if (legacyUrl) {
    return legacyUrl.replace(/\/provision\/?$/, "").replace(/\/$/, "");
  }

  return DEFAULT_API_BASE_URL;
}

function resolveApiKey(environment: RtkEnvironment): string | null {
  if (environment === "production") {
    return (
      process.env.RTK_API_KEY_PRODUCTION?.trim() ||
      process.env.RTK_API_KEY_LIVE?.trim() ||
      null
    );
  }

  return (
    process.env.RTK_API_KEY_TEST?.trim() ||
    process.env.RTK_API_KEY?.trim() ||
    process.env.RTK_RESELLER_API_TOKEN?.trim() ||
    null
  );
}

export interface RtkConfig {
  environment: RtkEnvironment;
  apiBaseUrl: string;
  apiUrl: string;
  apiKey: string | null;
  defaultPlan: string;
  defaultCountry: string;
  defaultMaxConnections: number;
  isProduction: boolean;
}

export function getRtkConfig(): RtkConfig {
  const environment = resolveEnvironment();
  const apiBaseUrl = resolveApiBaseUrl();
  const apiKey = resolveApiKey(environment);
  const maxConnectionsRaw = Number(process.env.RTK_DEFAULT_MAX_CONNECTIONS ?? 1);

  return {
    environment,
    apiBaseUrl,
    apiUrl: `${apiBaseUrl}/provision`,
    apiKey,
    defaultPlan:
      process.env.RTK_DEFAULT_PLAN?.trim() ||
      process.env.RTK_PROVISION_PLAN?.trim() ||
      "trial",
    defaultCountry: process.env.RTK_DEFAULT_COUNTRY?.trim() || "BR",
    defaultMaxConnections:
      Number.isFinite(maxConnectionsRaw) && maxConnectionsRaw > 0
        ? Math.floor(maxConnectionsRaw)
        : 1,
    isProduction: environment === "production",
  };
}

export function isRtkApiConfigured(): boolean {
  return Boolean(getRtkConfig().apiKey);
}

/** @deprecated Use isRtkApiConfigured */
export function isRtkProvisionEnabled(): boolean {
  return isRtkApiConfigured();
}
