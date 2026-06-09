/**
 * Pre-build: sync Neon/Vercel env vars, validate Supabase URLs, run migrations on Vercel.
 */
import { execSync } from "node:child_process";

const CONNECT_TIMEOUT = 10;

function syncDatabaseEnv() {
  if (!process.env.DATABASE_URL?.trim() && process.env.POSTGRES_URL?.trim()) {
    process.env.DATABASE_URL = process.env.POSTGRES_URL.trim();
  }
  if (!process.env.DIRECT_URL?.trim() && process.env.POSTGRES_URL_NON_POOLING?.trim()) {
    process.env.DIRECT_URL = process.env.POSTGRES_URL_NON_POOLING.trim();
  }
}

function parsePgUrl(url) {
  try {
    const normalized = url.replace(/^postgresql:\/\//, "https://").replace(/^postgres:\/\//, "https://");
    const parsed = new URL(normalized);
    return { hostname: parsed.hostname, port: parsed.port ? Number(parsed.port) : 5432 };
  } catch {
    return null;
  }
}

function isSupabaseHost(hostname) {
  return hostname.includes("supabase.com") || hostname.includes("supabase.co");
}

function validateDatabaseEnv() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const directUrl = process.env.DIRECT_URL?.trim();
  const warnings = [];

  if (!databaseUrl?.startsWith("postgresql")) {
    return {
      configured: false,
      error:
        "DATABASE_URL ausente. Supabase: pooler porta 6543. Neon: POSTGRES_URL ou DATABASE_URL.",
      warnings,
    };
  }

  if (!directUrl?.startsWith("postgresql")) {
    return {
      configured: false,
      error: "DIRECT_URL ausente. Supabase/Neon: conexão direta porta 5432 para migrations.",
      warnings,
    };
  }

  const runtime = parsePgUrl(databaseUrl);
  const direct = parsePgUrl(directUrl);

  if (runtime && direct && isSupabaseHost(runtime.hostname)) {
    const hasPooler = runtime.port === 6543 || databaseUrl.includes("pgbouncer=true");
    if (!hasPooler) {
      warnings.push("Supabase: DATABASE_URL deve usar pooler (6543 ou pgbouncer=true).");
    }
    if (direct.port === 6543) {
      return {
        configured: false,
        error: "DIRECT_URL não pode usar porta 6543 — use 5432 para prisma migrate deploy.",
        warnings,
      };
    }
  }

  return { configured: true, error: null, warnings };
}

function appendRuntimePoolParams(url) {
  const [base, query = ""] = url.split("?");
  const params = new URLSearchParams(query);
  if (!params.has("connect_timeout")) params.set("connect_timeout", String(CONNECT_TIMEOUT));
  if (!params.has("pool_timeout")) params.set("pool_timeout", String(CONNECT_TIMEOUT));
  if (!params.has("connection_limit")) params.set("connection_limit", "1");
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

syncDatabaseEnv();
const status = validateDatabaseEnv();
const onVercel = process.env.VERCEL === "1";

if (!status.configured) {
  const message = `[ensure-database-env] ${status.error} Veja docs/DEPLOY-VERCEL-POSTGRES.md`;
  if (onVercel) {
    console.error(message);
    process.exit(1);
  }
  console.warn(message);
} else {
  process.env.DATABASE_URL = appendRuntimePoolParams(process.env.DATABASE_URL.trim());
  for (const warning of status.warnings) {
    console.warn(`[ensure-database-env] ${warning}`);
  }
}

if (onVercel && status.configured) {
  console.log("[ensure-database-env] prisma migrate deploy (DIRECT_URL)...");
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
}
