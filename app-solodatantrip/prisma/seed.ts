import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";
import {
  loadProjectEnvFiles,
  syncDatabaseEnvFromVercelPostgres,
  validateDatabaseEnv,
} from "../lib/db/database-env";
import { generateLocalNtripLicense } from "../lib/ntrip/credential-generator";
import { trialSubscriptionLabel } from "../lib/ntrip/trial-config";
import { encryptRtkSecret } from "../lib/rtk/crypto";

loadProjectEnvFiles();
syncDatabaseEnvFromVercelPostgres();
const dbStatus = validateDatabaseEnv();
if (!dbStatus.configured) {
  console.error("[seed]", dbStatus.friendlyError);
  process.exit(1);
}
for (const warning of dbStatus.warnings) {
  console.warn("[seed]", warning);
}

const prisma = new PrismaClient();

const PLANS = [
  { slug: "trial", name: "Trial", price: 0, durationDays: 30, maxDevices: 1 },
  { slug: "mensal", name: "Mensal", price: 149.9, durationDays: 30, maxDevices: 1 },
  { slug: "trimestral", name: "Trimestral", price: 399.9, durationDays: 90, maxDevices: 2 },
  { slug: "anual", name: "Anual", price: 1399.9, durationDays: 365, maxDevices: 3 },
  { slug: "revendedor", name: "Revendedor", price: 4999.9, durationDays: 365, maxDevices: 50 },
];

async function main() {
  await prisma.$connect();

  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      create: {
        ...plan,
        features: { rtk: true, support: plan.slug !== "trial" },
      },
      update: { price: plan.price, durationDays: plan.durationDays, maxDevices: plan.maxDevices },
    });
  }

  const adminEmail = (process.env.ADMIN_EMAIL ?? process.env.SEED_ADMIN_EMAIL ?? "admin@datageo.com.br")
    .trim()
    .toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? "Admin@2026";
  const adminName = process.env.ADMIN_NAME ?? "Administrador Datageo";

  const passwordHash = await hashPassword(adminPassword);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      passwordHash,
      name: adminName,
      role: "SUPER_ADMIN",
      streams: 0,
      credentialsActive: false,
      ntripServer: process.env.NTRIP_SERVER?.trim() || "sa.geodnet.com",
      ntripPort: process.env.NTRIP_PORT?.trim() || "2101",
      ntripMountpoint: process.env.NTRIP_MOUNTPOINT?.trim() || "AUTO",
      ntripUsername: "NONE",
      ntripPasswordEnc: "NONE",
      subscriptionPlan: "trial",
      subscriptionStatus: "INATIVO",
      subscriptionLabel: "Aguardando ativação",
    },
    update: {
      passwordHash,
      name: adminName,
      role: "SUPER_ADMIN",
    },
  });

  const trialPlan = await prisma.plan.findUnique({ where: { slug: "trial" } });
  if (!trialPlan) throw new Error("Plano trial não encontrado.");

  const license = generateLocalNtripLicense(adminEmail, trialPlan);
  const expiresAt = new Date(license.expiresAt ?? Date.now() + 30 * 86400000);
  const now = new Date();

  const subscription = await prisma.ntripSubscription.create({
    data: {
      userId: admin.id,
      planId: trialPlan.id,
      status: "ACTIVE",
      source: "MANUAL",
      startsAt: now,
      expiresAt,
      activatedAt: now,
    },
  });

  await prisma.rtkLicense.create({
    data: {
      licenseId: license.licenseId,
      userId: admin.id,
      plan: trialPlan.slug,
      status: "ACTIVE",
      mode: "TEST",
      expiresAt,
      ntripServer: license.credentials.server,
      ntripPort: license.credentials.port,
      ntripMountpoint: license.credentials.mountpoint,
      ntripUsername: license.credentials.username,
      ntripPasswordEnc: encryptRtkSecret(license.credentials.password),
      isPrimary: true,
    },
  });

  await prisma.ntripAccount.create({
    data: {
      userId: admin.id,
      subscriptionId: subscription.id,
      rtkLicenseId: license.licenseId,
      host: license.credentials.server,
      port: license.credentials.port,
      mountpoint: license.credentials.mountpoint,
      username: license.credentials.username,
      passwordEnc: encryptRtkSecret(license.credentials.password),
      status: "ACTIVE",
      expiresAt,
      isPrimary: true,
      provisionedAt: now,
    },
  });

  await prisma.user.update({
    where: { id: admin.id },
    data: {
      activeLicenseId: license.licenseId,
      credentialsActive: true,
      streams: 1,
      expiryDate: expiresAt,
      ntripServer: license.credentials.server,
      ntripPort: license.credentials.port,
      ntripMountpoint: license.credentials.mountpoint,
      ntripUsername: license.credentials.username,
      ntripPasswordEnc: encryptRtkSecret(license.credentials.password),
      subscriptionPlan: trialPlan.slug,
      subscriptionStatus: "ATIVO",
      subscriptionLabel: trialSubscriptionLabel(),
    },
  });

  await prisma.rtkCaster.upsert({
    where: { id: "seed-caster-br" },
    create: {
      id: "seed-caster-br",
      name: "RTKDATA Brasil",
      host: "rtk.rtkdata.com",
      port: 2101,
      mountpoint: "AUTO",
      provider: "rtkdata",
      status: "ONLINE",
      latitude: -15.78,
      longitude: -47.93,
      uptimePercent: 99.5,
      latencyMs: 45,
      connectedUsers: 12,
      lastCheckedAt: new Date(),
    },
    update: { status: "ONLINE", lastCheckedAt: new Date() },
  });

  console.log(`Seed OK — plans=${PLANS.length} admin=${admin.email}`);
  console.log("Defina ADMIN_PASSWORD em produção (Vercel) e rode npm run db:seed após migrate.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
