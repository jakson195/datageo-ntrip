/**
 * Reinicia credenciais trial de um usuário (novo provisionamento RTK).
 *
 * Uso:
 *   npx tsx scripts/reset-trial-credentials.ts --email=user@example.com
 */
import { randomBytes } from "crypto";
import { PrismaClient, RtkApiMode, RtkLicenseStatus } from "@prisma/client";
import {
  loadProjectEnvFiles,
  syncDatabaseEnvFromVercelPostgres,
} from "../lib/db/database-env";
import { encryptRtkSecret } from "../lib/rtk/crypto";
import { getTrialDurationDays, trialSubscriptionLabel } from "../lib/ntrip/trial-config";

loadProjectEnvFiles();
syncDatabaseEnvFromVercelPostgres();

const prisma = new PrismaClient();

function parseEmailArg(): string {
  const arg = process.argv.find((a) => a.startsWith("--email="));
  if (!arg) {
    console.error("Informe --email=usuario@exemplo.com");
    process.exit(1);
  }
  const email = arg.slice("--email=".length).trim().toLowerCase();
  if (!email) process.exit(1);
  return email;
}

function rtkConfig() {
  const mode = (process.env.RTK_API_MODE ?? "sandbox").trim().toLowerCase();
  const isProd = mode === "production" || mode === "prod";
  const key = isProd
    ? (process.env.RTK_API_KEY_PRODUCTION ?? process.env.RTK_API_KEY_LIVE ?? "").trim()
    : (process.env.RTK_API_KEY_TEST ?? process.env.RTK_API_KEY ?? "").trim();
  const base = (
    process.env.RTK_API_BASE_URL ?? "https://rtkdata-reseller-1.onrender.com/api/v1"
  ).replace(/\/$/, "");
  return { key, url: `${base}/provision`, isProd };
}

function generateUsername(email: string): string {
  const local = email.split("@")[0]?.replace(/[^a-z0-9]/gi, "").slice(0, 12).toLowerCase() || "user";
  return `dg_${local}_${randomBytes(3).toString("hex")}`;
}

type ProvisionResponse = {
  ok?: boolean;
  license_id?: string;
  plan?: string;
  status?: string;
  mode?: string;
  expires_at?: number;
  credentials?: {
    username?: string;
    password?: string;
    server?: string;
    port?: number | string;
    mountpoint?: string;
  };
  error?: string;
};

async function provisionTrial(email: string, name: string, idempotencyKey: string) {
  const { key, url, isProd } = rtkConfig();
  if (!key) throw new Error("Chave RTK não configurada (.env.local).");

  const username = generateUsername(email);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan: "trial",
      idempotency_key: idempotencyKey,
      username,
      customer: { email, name, country: process.env.RTK_DEFAULT_COUNTRY?.trim() || "BR" },
      max_connections: Number(process.env.RTK_DEFAULT_MAX_CONNECTIONS ?? 1) || 1,
    }),
  });

  const body = (await res.json()) as ProvisionResponse;
  if (!res.ok || body.ok !== true || !body.credentials?.username || !body.credentials.password) {
    throw new Error(body.error ?? `Provision falhou (HTTP ${res.status}).`);
  }

  return {
    licenseId: body.license_id ?? `trial-${Date.now()}`,
    plan: body.plan ?? "trial",
    mode: (body.mode === "production" ? "PRODUCTION" : "TEST") as RtkApiMode,
    expiresAt: body.expires_at
      ? new Date(body.expires_at > 1_000_000_000_000 ? body.expires_at : body.expires_at * 1000)
      : new Date(Date.now() + getTrialDurationDays() * 24 * 60 * 60 * 1000),
    credentials: {
      username: body.credentials.username,
      password: body.credentials.password,
      server: body.credentials.server ?? process.env.NTRIP_SERVER ?? "rtk.rtkdata.com",
      port: String(body.credentials.port ?? process.env.NTRIP_PORT ?? "2101"),
      mountpoint: body.credentials.mountpoint?.trim() || "AUTO",
    },
    isProd,
  };
}

async function main() {
  const email = parseEmailArg();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Usuário não encontrado: ${email}`);
    process.exit(1);
  }

  const trialPlan = await prisma.plan.findUnique({ where: { slug: "trial" } });
  if (!trialPlan) {
    console.error('Plano "trial" não encontrado. Rode: node scripts/ensure-plans.mjs');
    process.exit(1);
  }

  console.log(`Reiniciando trial para ${email} (${user.name})…`);

  await prisma.trialRegistry.deleteMany({ where: { email } });

  await prisma.ntripAccount.updateMany({
    where: { userId: user.id },
    data: { status: "SUSPENDED", isPrimary: false },
  });

  await prisma.ntripSubscription.updateMany({
    where: { userId: user.id, status: { in: ["ACTIVE", "PENDING"] } },
    data: { status: "EXPIRED" },
  });

  await prisma.rtkLicense.updateMany({
    where: { userId: user.id, deletedAt: null },
    data: { status: "EXPIRED", isPrimary: false },
  });

  const idempotencyKey = `trial-reset-${user.id}-${Date.now()}`;
  const provisioned = await provisionTrial(email, user.name, idempotencyKey);
  const passwordEnc = encryptRtkSecret(provisioned.credentials.password);
  const now = new Date();

  const subscription = await prisma.ntripSubscription.create({
    data: {
      userId: user.id,
      planId: trialPlan.id,
      status: "ACTIVE",
      source: "TRIAL",
      startsAt: now,
      expiresAt: provisioned.expiresAt,
      activatedAt: now,
    },
  });

  await prisma.rtkLicense.create({
    data: {
      licenseId: provisioned.licenseId,
      userId: user.id,
      plan: provisioned.plan,
      status: RtkLicenseStatus.ACTIVE,
      mode: provisioned.mode,
      expiresAt: provisioned.expiresAt,
      ntripServer: provisioned.credentials.server,
      ntripPort: provisioned.credentials.port,
      ntripMountpoint: provisioned.credentials.mountpoint,
      ntripUsername: provisioned.credentials.username,
      ntripPasswordEnc: passwordEnc,
      isPrimary: true,
      idempotencyKey,
    },
  });

  await prisma.ntripAccount.create({
    data: {
      userId: user.id,
      subscriptionId: subscription.id,
      rtkLicenseId: provisioned.licenseId,
      host: provisioned.credentials.server,
      port: provisioned.credentials.port,
      mountpoint: provisioned.credentials.mountpoint,
      username: provisioned.credentials.username,
      passwordEnc,
      status: "ACTIVE",
      expiresAt: provisioned.expiresAt,
      isPrimary: true,
      provisionedAt: now,
    },
  });

  await prisma.trialRegistry.create({
    data: {
      email,
      userId: user.id,
      licenseId: provisioned.licenseId,
      status: "ACTIVE",
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      credentialsActive: true,
      streams: 1,
      expiryDate: provisioned.expiresAt,
      ntripServer: provisioned.credentials.server,
      ntripPort: provisioned.credentials.port,
      ntripMountpoint: provisioned.credentials.mountpoint,
      ntripUsername: provisioned.credentials.username,
      ntripPasswordEnc: passwordEnc,
      subscriptionPlan: "trial",
      subscriptionStatus: "ATIVO",
      subscriptionLabel: trialSubscriptionLabel(),
      activeLicenseId: provisioned.licenseId,
    },
  });

  console.log("\nTrial reiniciado com sucesso.");
  console.log("license_id:", provisioned.licenseId);
  console.log("username:", provisioned.credentials.username);
  console.log("server:", provisioned.credentials.server, "port:", provisioned.credentials.port);
  console.log("mountpoint:", provisioned.credentials.mountpoint);
  console.log("expira:", provisioned.expiresAt.toISOString().slice(0, 10));
  console.log("\nAceda a /area-cliente/credenciais para ver a senha (logout/login se necessário).");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
