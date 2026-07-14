/**
 * Testa fluxo PIX: login → POST /api/pix/create
 * Uso: npx tsx scripts/test-billing-pix.ts
 * Requer: MERCADOPAGO_ACCESS_TOKEN, Postgres, dev server em :3000
 */
import { PrismaClient } from "@prisma/client";
import {
  loadProjectEnvFiles,
  syncDatabaseEnvFromVercelPostgres,
} from "../lib/db/database-env";

loadProjectEnvFiles();
syncDatabaseEnvFromVercelPostgres();

const BASE = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
const EMAIL = process.env.TEST_USER_EMAIL?.trim() || "admin@datageo.com.br";
const PASSWORD = process.env.TEST_USER_PASSWORD?.trim() || "Admin@2026";

async function main() {
  const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() || process.env.MP_ACCESS_TOKEN?.trim();
  if (!mpToken) {
    console.error("❌ MERCADOPAGO_ACCESS_TOKEN não definido em .env.local");
    console.error("   Obtenha em: https://www.mercadopago.com.br/developers/panel/app");
    process.exit(1);
  }
  console.log("✓ Token MP configurado (" + mpToken.slice(0, 12) + "…)");

  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    const plan = await prisma.plan.findUnique({ where: { slug: "mensal" } });
    if (!plan) {
      console.error("❌ Plano mensal não encontrado. Rode: node scripts/ensure-plans.mjs");
      process.exit(1);
    }
    console.log("✓ Plano mensal:", Number(plan.price), "BRL");
  } finally {
    await prisma.$disconnect();
  }

  let healthOk = false;
  try {
    const h = await fetch(`${BASE}/api/health`);
    healthOk = h.ok;
  } catch {
    healthOk = false;
  }
  if (!healthOk) {
    console.error(`❌ Servidor não responde em ${BASE}. Rode: npm run dev`);
    process.exit(1);
  }
  console.log("✓ Servidor OK:", BASE);

  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const loginJson = (await loginRes.json()) as { error?: string };
  if (!loginRes.ok) {
    console.error("❌ Login falhou:", loginJson.error ?? loginRes.status);
    process.exit(1);
  }
  const cookie = loginRes.headers.get("set-cookie")?.split(";")[0] ?? "";
  if (!cookie) {
    console.error("❌ Sessão não retornou cookie");
    process.exit(1);
  }
  console.log("✓ Login OK:", EMAIL);

  const pixRes = await fetch(`${BASE}/api/pix/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ planSlug: "mensal" }),
  });
  const pixJson = (await pixRes.json()) as {
    error?: string;
    qrCode?: string;
    qrCodeBase64?: string;
    paymentId?: string;
  };

  if (!pixRes.ok) {
    console.error("❌ PIX create falhou:", pixJson.error ?? pixRes.status);
    process.exit(1);
  }

  console.log("✓ PIX gerado com sucesso");
  console.log("  paymentId:", pixJson.paymentId);
  console.log("  qrCode length:", pixJson.qrCode?.length ?? 0);
  console.log("  qrCodeBase64:", pixJson.qrCodeBase64 ? "sim" : "não");
  console.log("\nAbra http://localhost:3000/area-cliente/assinatura e pague o PIX de teste no app MP.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
