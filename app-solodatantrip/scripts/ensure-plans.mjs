/**
 * Garante planos base no PostgreSQL (idempotente).
 * Rodado no build da Vercel para evitar cadastro quebrado sem seed manual.
 */
import { PrismaClient } from "@prisma/client";

const PLANS = [
  { slug: "trial", name: "Trial", price: 0, durationDays: 30, maxDevices: 1 },
  { slug: "mensal", name: "Mensal", price: 149.9, durationDays: 30, maxDevices: 1 },
  { slug: "trimestral", name: "Trimestral", price: 399.9, durationDays: 90, maxDevices: 2 },
  { slug: "anual", name: "Anual", price: 1399.9, durationDays: 365, maxDevices: 3 },
  { slug: "revendedor", name: "Revendedor", price: 4999.9, durationDays: 365, maxDevices: 50 },
];

function syncDatabaseEnv() {
  if (!process.env.DATABASE_URL?.trim()) {
    const runtime =
      process.env.POSTGRES_URL?.trim() ||
      process.env.POSTGRES_PRISMA_URL?.trim();
    if (runtime) process.env.DATABASE_URL = runtime;
  }
}

async function main() {
  if (process.env.VERCEL === "1" && !process.env.DATABASE_URL?.trim() && !process.env.POSTGRES_URL?.trim()) {
    console.log("[ensure-plans] Sem DATABASE_URL na Vercel — ignorando.");
    return;
  }

  syncDatabaseEnv();

  if (!process.env.DATABASE_URL?.trim()) {
    console.log("[ensure-plans] Sem banco configurado — ignorando.");
    return;
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
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
    console.log(`[ensure-plans] OK — ${PLANS.length} planos`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[ensure-plans]", error);
  process.exit(1);
});
