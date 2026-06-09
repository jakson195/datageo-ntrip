import "server-only";

export type RtkEnvironment = "sandbox" | "production";

const DEFAULT_SANDBOX_URL =
  "https://rtkdata-reseller-1.onrender.com/api/v1/provision";

function resolveEnvironment(): RtkEnvironment {
  const raw = process.env.RTK_API_MODE?.trim().toLowerCase();
  if (raw === "production" || raw === "prod") return "production";
  return "sandbox";
}

function resolveUrl(environment: RtkEnvironment): string {
  if (environment === "production") {
    const productionUrl =
      process.env.RTK_API_URL_PRODUCTION?.trim() ||
      process.env.RTK_API_URL?.trim();
    if (productionUrl) return productionUrl.replace(/\/$/, "");
  }

  const sandboxUrl =
    process.env.RTK_API_URL?.trim() ||
    process.env.RTK_RESELLER_API_URL?.trim() ||
    DEFAULT_SANDBOX_URL;

  return sandboxUrl.replace(/\/$/, "");
}

function resolveApiKey(environment: RtkEnvironment): string | null {
  if (environment === "production") {
    const productionKey =
      process.env.RTK_API_KEY_PRODUCTION?.trim() ||
      process.env.RTK_API_KEY?.trim();
    if (productionKey) return productionKey;
  }

  const sandboxKey =
    process.env.RTK_API_KEY?.trim() ||
    process.env.RTK_RESELLER_API_TOKEN?.trim();

  return sandboxKey || null;
}

export interface RtkConfig {
  environment: RtkEnvironment;
  apiUrl: string;
  apiKey: string | null;
  defaultPlan: string;
  isProduction: boolean;
}

export function getRtkConfig(): RtkConfig {
  const environment = resolveEnvironment();
  const apiKey = resolveApiKey(environment);

  return {
    environment,
    apiUrl: resolveUrl(environment),
    apiKey,
    defaultPlan:
      process.env.RTK_DEFAULT_PLAN?.trim() ||
      process.env.RTK_PROVISION_PLAN?.trim() ||
      "trial",
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
