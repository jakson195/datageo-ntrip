import "server-only";

type RtkLogLevel = "info" | "warn" | "error";

interface RtkLogPayload {
  level: RtkLogLevel;
  event: string;
  [key: string]: unknown;
}

function writeLog(payload: RtkLogPayload): void {
  const line = JSON.stringify({
    service: "rtk-license",
    timestamp: new Date().toISOString(),
    ...payload,
  });

  if (payload.level === "error") {
    console.error(line);
    return;
  }

  if (payload.level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

function maskSecret(value: string | undefined | null): string {
  if (!value) return "[empty]";
  if (value.length <= 8) return "[redacted]";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export function logRtkRequest(params: {
  url: string;
  plan: string;
  customerEmail: string;
  customerName: string;
  idempotencyKey: string;
  environment: string;
}): void {
  writeLog({
    level: "info",
    event: "provision.request",
    url: params.url,
    plan: params.plan,
    customerEmail: params.customerEmail,
    customerName: params.customerName,
    idempotencyKey: params.idempotencyKey,
    environment: params.environment,
  });
}

export function logRtkResponse(params: {
  httpStatus: number;
  ok: boolean;
  licenseId?: string;
  status?: string;
  mode?: string;
  replayed?: boolean;
  durationMs: number;
}): void {
  writeLog({
    level: "info",
    event: "provision.response",
    httpStatus: params.httpStatus,
    ok: params.ok,
    licenseId: params.licenseId,
    status: params.status,
    mode: params.mode,
    replayed: params.replayed,
    durationMs: params.durationMs,
  });
}

export function logRtkError(params: {
  event: string;
  message: string;
  httpStatus?: number;
  code?: string;
  detail?: string;
}): void {
  writeLog({
    level: "error",
    event: params.event,
    message: params.message,
    httpStatus: params.httpStatus,
    code: params.code,
    detail: params.detail,
  });
}

export function logRtkValidationFailure(params: {
  reason: string;
  body?: Record<string, unknown>;
}): void {
  writeLog({
    level: "warn",
    event: "provision.validation_failed",
    reason: params.reason,
    body: params.body
      ? {
          ...params.body,
          credentials: params.body.credentials
            ? {
                ...(params.body.credentials as Record<string, unknown>),
                password: maskSecret(
                  (params.body.credentials as { password?: string }).password,
                ),
              }
            : undefined,
        }
      : undefined,
  });
}
