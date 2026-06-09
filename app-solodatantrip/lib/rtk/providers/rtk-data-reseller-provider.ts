import "server-only";

import { randomUUID } from "crypto";
import { noStoreFetch } from "@/lib/http";
import { getRtkConfig } from "../config";
import {
  logRtkError,
  logRtkRequest,
  logRtkResponse,
  logRtkValidationFailure,
} from "../logger";
import type {
  CreateRtkLicenseResult,
  RtkApiMode,
  RtkLicenseRecord,
  RtkProvisionApiResponse,
} from "../types";
import type { RtkProvider, RtkProvisionParams, RtkRenewParams } from "./types";

const VALID_MODES: RtkApiMode[] = ["test", "production"];
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeMode(raw: string | undefined): RtkApiMode | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "test" || normalized === "sandbox") return "test";
  if (normalized === "production" || normalized === "prod") return "production";
  return null;
}

function parseExpiresAt(raw: number | undefined): string | null {
  if (typeof raw !== "number" || raw <= 0) return null;
  const ms = raw > 1_000_000_000_000 ? raw : raw * 1000;
  return new Date(ms).toISOString();
}

function mapHttpError(
  status: number,
  body: RtkProvisionApiResponse,
): CreateRtkLicenseResult {
  const detail = body.error || body.message;

  if (status === 401) {
    logRtkError({
      event: "provision.unauthorized",
      message: "Token RTK inválido ou expirado.",
      httpStatus: status,
      code: "UNAUTHORIZED",
      detail,
    });
    return {
      ok: false,
      error: "Token de autenticação RTK inválido.",
      code: "UNAUTHORIZED",
      httpStatus: status,
    };
  }

  if (status === 403) {
    logRtkError({
      event: "provision.forbidden",
      message: "Sem permissão para provisionar licenças RTK.",
      httpStatus: status,
      code: "FORBIDDEN",
      detail,
    });
    return {
      ok: false,
      error: "Sem permissão para provisionar licenças RTK.",
      code: "FORBIDDEN",
      httpStatus: status,
    };
  }

  if (status >= 500) {
    logRtkError({
      event: "provision.external_error",
      message: "Erro no servidor RTK externo.",
      httpStatus: status,
      code: "EXTERNAL_ERROR",
      detail,
    });
    return {
      ok: false,
      error: "Erro no serviço RTK externo. Tente novamente em instantes.",
      code: "EXTERNAL_ERROR",
      httpStatus: status,
    };
  }

  return {
    ok: false,
    error: detail || "Não foi possível provisionar a licença RTK.",
    code: "VALIDATION_ERROR",
    httpStatus: status,
  };
}

function validateApiResponse(
  body: RtkProvisionApiResponse,
  fallbackPlan: string,
): RtkLicenseRecord | null {
  if (body.ok !== true) {
    logRtkValidationFailure({ reason: "ok !== true", body: body as Record<string, unknown> });
    return null;
  }

  if (body.status !== "active") {
    logRtkValidationFailure({
      reason: `status inválido: ${body.status ?? "undefined"}`,
      body: body as Record<string, unknown>,
    });
    return null;
  }

  const mode = normalizeMode(body.mode);
  if (!mode || !VALID_MODES.includes(mode)) {
    logRtkValidationFailure({
      reason: `mode inválido: ${body.mode ?? "undefined"}`,
      body: body as Record<string, unknown>,
    });
    return null;
  }

  const creds = body.credentials;
  if (!creds?.username || !creds?.password || !creds?.server) {
    logRtkValidationFailure({
      reason: "credenciais incompletas",
      body: body as Record<string, unknown>,
    });
    return null;
  }

  return {
    licenseId: body.license_id ?? "",
    plan: body.plan ?? fallbackPlan,
    status: "active",
    mode,
    expiresAt: parseExpiresAt(body.expires_at),
    credentials: {
      username: creds.username,
      password: creds.password,
      server: creds.server,
      port: String(creds.port ?? 2101),
      mountpoint: creds.mountpoint?.trim() || "AUTO",
    },
  };
}

async function executeProvisionRequest(
  params: RtkProvisionParams,
): Promise<CreateRtkLicenseResult> {
  const config = getRtkConfig();
  if (!config.apiKey) {
    return {
      ok: false,
      error: "Provisionamento RTK não configurado no servidor.",
      code: "NOT_CONFIGURED",
    };
  }

  logRtkRequest({
    url: config.apiUrl,
    plan: params.plan,
    customerEmail: params.customerEmail,
    customerName: params.customerName,
    idempotencyKey: params.idempotencyKey,
    environment: config.environment,
  });

  const startedAt = Date.now();
  let response: Response;

  try {
    response = await noStoreFetch(config.apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan: params.plan,
        idempotency_key: params.idempotencyKey,
        customer: {
          email: params.customerEmail,
          name: params.customerName,
        },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    logRtkError({
      event: "provision.network_error",
      message: "Falha de rede ao contactar API RTK.",
      code: "NETWORK_ERROR",
      detail: error instanceof Error ? error.message : String(error),
    });
    return {
      ok: false,
      error: "Não foi possível contactar o servidor RTK. Tente novamente em instantes.",
      code: "NETWORK_ERROR",
    };
  }

  const durationMs = Date.now() - startedAt;
  let body: RtkProvisionApiResponse;

  try {
    body = (await response.json()) as RtkProvisionApiResponse;
  } catch {
    return {
      ok: false,
      error: "Resposta inválida do servidor RTK.",
      code: "INVALID_RESPONSE",
      httpStatus: response.status,
    };
  }

  logRtkResponse({
    httpStatus: response.status,
    ok: Boolean(body.ok),
    licenseId: body.license_id,
    status: body.status,
    mode: body.mode,
    replayed: body.replayed,
    durationMs,
  });

  if (!response.ok || body.ok !== true) {
    return mapHttpError(response.status, body);
  }

  const license = validateApiResponse(body, params.plan);
  if (!license) {
    return {
      ok: false,
      error: "Resposta da API RTK não passou na validação de segurança.",
      code: "VALIDATION_ERROR",
      httpStatus: response.status,
    };
  }

  return { ok: true, data: license, replayed: body.replayed };
}

async function withRetry(
  fn: () => Promise<CreateRtkLicenseResult>,
): Promise<CreateRtkLicenseResult> {
  let lastResult: CreateRtkLicenseResult | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const result = await fn();
    lastResult = result;

    if (result.ok) return result;

    const retryable =
      result.code === "EXTERNAL_ERROR" ||
      result.code === "NETWORK_ERROR" ||
      (result.httpStatus !== undefined && result.httpStatus >= 500);

    if (!retryable || attempt === MAX_RETRIES) return result;

    logRtkError({
      event: "provision.retry",
      message: `Tentativa ${attempt}/${MAX_RETRIES} falhou. Retentando…`,
      code: result.code,
      httpStatus: result.httpStatus,
      detail: result.error,
    });

    await sleep(RETRY_BASE_MS * attempt);
  }

  return lastResult ?? {
    ok: false,
    error: "Falha desconhecida no provisionamento RTK.",
    code: "EXTERNAL_ERROR",
  };
}

export class RtkDataResellerProvider implements RtkProvider {
  readonly name = "rtkdata-reseller";

  async provision(params: RtkProvisionParams): Promise<CreateRtkLicenseResult> {
    return withRetry(() => executeProvisionRequest(params));
  }

  async renew(params: RtkRenewParams): Promise<CreateRtkLicenseResult> {
    return this.provision({
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      plan: params.plan,
      idempotencyKey: params.idempotencyKey || randomUUID(),
    });
  }
}
