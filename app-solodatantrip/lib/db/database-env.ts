/** PostgreSQL env sync, Supabase/Neon validation and runtime connection params. */

import { config } from "dotenv";
import { resolve } from "node:path";

export const DB_CONNECT_TIMEOUT_SEC = 10;
export const DB_RETRY_MAX_ATTEMPTS = 3;
export const DB_RETRY_BASE_DELAY_MS = 250;

export type DatabaseConfigStatus = {
  configured: boolean;
  friendlyError: string | null;
  warnings: string[];
};

export function loadProjectEnvFiles(): void {
  config({ path: resolve(process.cwd(), ".env") });
  config({ path: resolve(process.cwd(), ".env.local"), override: true });
}

function firstEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function syncDatabaseEnvFromVercelPostgres(): void {
  if (!process.env.DATABASE_URL?.trim()) {
    const runtime = firstEnv("POSTGRES_URL", "POSTGRES_PRISMA_URL", "DATABASE_URL");
    if (runtime) process.env.DATABASE_URL = runtime;
  }

  if (!process.env.DIRECT_URL?.trim()) {
    const direct = firstEnv(
      "POSTGRES_URL_NON_POOLING",
      "DATABASE_URL_UNPOOLED",
      "POSTGRES_URL_NO_SSL",
    );
    if (direct) process.env.DIRECT_URL = direct;
  }
}

function parsePgUrl(url: string): { hostname: string; port: number } | null {
  try {
    const normalized = url.replace(/^postgresql:\/\//, "https://").replace(/^postgres:\/\//, "https://");
    const parsed = new URL(normalized);
    return {
      hostname: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 5432,
    };
  } catch {
    return null;
  }
}

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "db";
}

function isSupabaseHost(hostname: string): boolean {
  return hostname.includes("supabase.com") || hostname.includes("supabase.co");
}

function isNeonHost(hostname: string): boolean {
  return hostname.includes("neon.tech");
}

/** Runtime (DATABASE_URL): pooler params for Vercel serverless. */
export function appendRuntimePoolParams(url: string): string {
  const params = new URLSearchParams();

  for (const [key, value] of new URLSearchParams(url.split("?")[1] ?? "")) {
    params.set(key, value);
  }

  if (!params.has("connect_timeout")) {
    params.set("connect_timeout", String(DB_CONNECT_TIMEOUT_SEC));
  }
  if (!params.has("pool_timeout")) {
    params.set("pool_timeout", String(DB_CONNECT_TIMEOUT_SEC));
  }
  if (!params.has("connection_limit")) {
    params.set("connection_limit", "1");
  }

  const base = url.split("?")[0];
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function validateDatabaseEnv(): DatabaseConfigStatus {
  syncDatabaseEnvFromVercelPostgres();

  const databaseUrl = process.env.DATABASE_URL?.trim();
  const directUrl = process.env.DIRECT_URL?.trim();
  const warnings: string[] = [];

  if (!databaseUrl?.startsWith("postgresql")) {
    return {
      configured: false,
      friendlyError:
        "PostgreSQL não configurado. Defina DATABASE_URL (pooler Supabase porta 6543) e DIRECT_URL (porta 5432) nas variáveis da Vercel.",
      warnings: [],
    };
  }

  if (!directUrl?.startsWith("postgresql")) {
    return {
      configured: false,
      friendlyError:
        "DIRECT_URL ausente. Migrations e seed exigem conexão direta PostgreSQL (Supabase porta 5432).",
      warnings: [],
    };
  }

  const runtime = parsePgUrl(databaseUrl);
  const direct = parsePgUrl(directUrl);

  if (runtime && direct) {
    if (isSupabaseHost(runtime.hostname) && !isLocalHost(runtime.hostname)) {
      const hasPooler =
        runtime.port === 6543 || databaseUrl.includes("pgbouncer=true");
      if (!hasPooler) {
        warnings.push(
          "Supabase: DATABASE_URL deve usar o pooler (porta 6543 ou ?pgbouncer=true).",
        );
      }
      if (direct.port === 6543) {
        return {
          configured: false,
          friendlyError:
            "DIRECT_URL não pode usar a porta 6543. Use conexão direta na porta 5432 para migrations Prisma.",
          warnings,
        };
      }
    }

    if (isNeonHost(runtime.hostname) && !isLocalHost(runtime.hostname)) {
      if (!runtime.hostname.includes("-pooler") && runtime.hostname === direct.hostname) {
        warnings.push(
          "Neon: DATABASE_URL deve usar o host -pooler; DIRECT_URL o host direto.",
        );
      }
    }
  }

  return { configured: true, friendlyError: null, warnings };
}

export function applyRuntimeDatabaseUrl(): void {
  syncDatabaseEnvFromVercelPostgres();
  const status = validateDatabaseEnv();
  if (status.configured && process.env.DATABASE_URL) {
    process.env.DATABASE_URL = appendRuntimePoolParams(process.env.DATABASE_URL.trim());
  }
}

export function getDatabaseUrl(): string | undefined {
  applyRuntimeDatabaseUrl();
  return process.env.DATABASE_URL?.trim() || undefined;
}

export function isDatabaseConfigured(): boolean {
  return validateDatabaseEnv().configured;
}

export function getDatabaseConfigStatus(): DatabaseConfigStatus {
  return validateDatabaseEnv();
}
