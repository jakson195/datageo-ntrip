/** API SICAR Temas do Imóvel — ConectaGov/SERPRO (swagger v1). */

export const SICAR_API_PRODUCTION_BASE =
  "https://apigateway.conectagov.estaleiro.serpro.gov.br/api-sicar-tema/v1";

export const SICAR_API_HOMOLOG_BASE =
  "https://h-apigateway.conectagov.np.estaleiro.serpro.gov.br/api-sicar-tema/v1";

export const SICAR_OAUTH_PRODUCTION_URL =
  "https://apigateway.conectagov.estaleiro.serpro.gov.br/oauth2/jwt-token";

export const SICAR_OAUTH_HOMOLOG_URL =
  "https://h-apigateway.conectagov.np.estaleiro.serpro.gov.br/oauth2/jwt-token";

export type SicarTemaResult = {
  tema: string;
  identificadorImovel?: string | number;
  areaTotalTema?: string;
  poligonoAreaTema?: string;
};

export type SicarImovelResponse = {
  results?: SicarTemaResult[];
};

export function getSicarApiBaseUrl(): string {
  const custom = process.env.SICAR_API_BASE_URL?.trim();
  if (custom) return custom.replace(/\/$/, "");
  const env = process.env.SICAR_API_ENV?.trim().toLowerCase();
  return env === "homolog" || env === "homologacao" ? SICAR_API_HOMOLOG_BASE : SICAR_API_PRODUCTION_BASE;
}

export function getSicarOAuthTokenUrl(): string {
  const custom = process.env.SICAR_OAUTH_TOKEN_URL?.trim();
  if (custom) return custom;
  const env = process.env.SICAR_API_ENV?.trim().toLowerCase();
  return env === "homolog" || env === "homologacao" ? SICAR_OAUTH_HOMOLOG_URL : SICAR_OAUTH_PRODUCTION_URL;
}

export function isSicarApiConfigured(): boolean {
  return Boolean(
    process.env.SICAR_API_BEARER_TOKEN?.trim() ||
      (process.env.SICAR_CLIENT_ID?.trim() && process.env.SICAR_CLIENT_SECRET?.trim()),
  );
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function fetchOAuthToken(): Promise<string | null> {
  const clientId = process.env.SICAR_CLIENT_ID?.trim();
  const clientSecret = process.env.SICAR_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  const tokenUrl = getSicarOAuthTokenUrl();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: "grant_type=client_credentials",
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;
    const ttlSec = typeof data.expires_in === "number" ? data.expires_in : 3600;
    cachedToken = {
      value: data.access_token,
      expiresAt: Date.now() + Math.max(60, ttlSec - 60) * 1000,
    };
    return cachedToken.value;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function getSicarBearerToken(): Promise<string | null> {
  const staticToken = process.env.SICAR_API_BEARER_TOKEN?.trim();
  if (staticToken) return staticToken;

  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  return fetchOAuthToken();
}

/** Código CAR: UF-NNNNNN-YYYYMMDD-HASH */
export function normalizeCodigoImovel(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidCodigoImovel(codigo: string): boolean {
  return /^[A-Z]{2}-\d+-\d{8}-[A-F0-9]+$/i.test(codigo);
}

export async function fetchSicarImovelTemas(
  codigoImovelRaw: string,
): Promise<{ ok: true; data: SicarImovelResponse } | { ok: false; status: number; error: string }> {
  const codigoImovel = normalizeCodigoImovel(codigoImovelRaw);
  if (!isValidCodigoImovel(codigoImovel)) {
    return { ok: false, status: 400, error: "Código do imóvel CAR inválido." };
  }

  if (!isSicarApiConfigured()) {
    return {
      ok: false,
      status: 503,
      error:
        "API SICAR não configurada. Defina SICAR_API_BEARER_TOKEN ou SICAR_CLIENT_ID + SICAR_CLIENT_SECRET.",
    };
  }

  const token = await getSicarBearerToken();
  if (!token) {
    return {
      ok: false,
      status: 503,
      error: "Não foi possível obter token OAuth da API SICAR (ConectaGov).",
    };
  }

  const url = `${getSicarApiBaseUrl()}/${encodeURIComponent(codigoImovel)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "User-Agent": "DatageoNTRIP-CAD/1.0",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (res.status === 404) {
      return { ok: false, status: 404, error: "Imóvel não encontrado no SICAR." };
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: `API SICAR retornou erro ${res.status}.`,
      };
    }

    const data = (await res.json()) as SicarImovelResponse;
    if (!data.results?.length) {
      return { ok: false, status: 404, error: "Nenhum tema retornado para este imóvel." };
    }

    return { ok: true, data };
  } catch {
    return { ok: false, status: 502, error: "Falha ao consultar API SICAR." };
  } finally {
    clearTimeout(timer);
  }
}
