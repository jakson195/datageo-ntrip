/**
 * Corrige produção: cria planos e ativa trial para cadastros órfãos.
 * Uso: npx tsx scripts/repair-production-signups.ts [.env.production.local]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { ntripSubscriptionActivationService } from "../lib/ntrip/subscription-activation.service";

function loadEnvFile(filePath: string) {
  const content = readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const envFile = process.argv[2] ?? ".env.production.local";
loadEnvFile(resolve(process.cwd(), envFile));

const databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  process.env.POSTGRES_URL?.trim() ||
  process.env.POSTGRES_PRISMA_URL?.trim();

if (!databaseUrl) {
  console.error("[repair] DATABASE_URL ausente no arquivo de env.");
  process.exit(1);
}

process.env.DATABASE_URL = databaseUrl;

const PLANS = [
  { slug: "trial", name: "Trial", price: 0, durationDays: 30, maxDevices: 1 },
  { slug: "mensal", name: "Plano Mensal", price: 240, durationDays: 30, maxDevices: 1 },
  { slug: "anual", name: "Plano Anual", price: 2399.76, durationDays: 365, maxDevices: 3 },
  { slug: "quinquenal", name: "Plano de 5 anos", price: 11520, durationDays: 1825, maxDevices: 5 },
  { slug: "empresa", name: "Empresa", price: 0, durationDays: 365, maxDevices: 50 },
];

const prisma = new PrismaClient();

async function ensurePlans() {
  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      create: {
        ...plan,
        features: { rtk: true, support: plan.slug !== "trial" },
      },
      update: {
        price: plan.price,
        durationDays: plan.durationDays,
        maxDevices: plan.maxDevices,
      },
    });
  }
  console.log(`[repair] Planos OK (${PLANS.length})`);
}

async function repairOrphanUsers() {
  const users = await prisma.user.findMany({
    where: { deletedAt: null, role: "USER" },
    select: {
      id: true,
      email: true,
      credentialsActive: true,
      ntripSubscriptions: {
        where: { deletedAt: null },
        select: { id: true, status: true },
        take: 1,
      },
    },
  });

  let repaired = 0;
  for (const user of users) {
    const hasActive =
      user.credentialsActive ||
      user.ntripSubscriptions.some((s) => s.status === "ACTIVE" || s.status === "PENDING");
    if (hasActive) continue;

    const result = await ntripSubscriptionActivationService.activateTrialOnSignup(user.id);
    if (result.ok) {
      console.log(`[repair] Trial ativado: ${user.email}`);
      repaired += 1;
    } else {
      console.warn(`[repair] Falha em ${user.email}: ${result.error}`);
    }
  }

  console.log(`[repair] Usuários reparados: ${repaired}/${users.length}`);
}

async function main() {
  await prisma.$connect();
  await ensurePlans();
  await repairOrphanUsers();
}

main()
  .catch((error) => {
    console.error("[repair]", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
