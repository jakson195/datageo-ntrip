/**
 * Redefine a senha de um usuário pelo e-mail (uso local / suporte).
 * Uso: npm run db:reset-password -- seu@email.com NovaSenha123
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";
import { validateEmail, validatePassword } from "../lib/password-validation";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

function syncDatabaseEnv() {
  if (!process.env.DATABASE_URL?.trim()) {
    const runtime =
      process.env.POSTGRES_URL?.trim() ||
      process.env.POSTGRES_PRISMA_URL?.trim();
    if (runtime) process.env.DATABASE_URL = runtime;
  }
}

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const password = process.argv[3] ?? "";

  const emailCheck = validateEmail(email ?? "");
  if (!emailCheck.ok) {
    console.error(emailCheck.error);
    process.exit(1);
  }

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.ok) {
    console.error(passwordCheck.error);
    console.error("Exemplo: npm run db:reset-password -- seu@email.com NovaSenha123");
    process.exit(1);
  }

  syncDatabaseEnv();
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL não configurado.");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    const user = await prisma.user.findUnique({ where: { email: email! } });
    if (!user) {
      console.error(`Nenhum usuário com e-mail ${email}.`);
      process.exit(1);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password) },
    });

    console.log(`[reset-user-password] Senha atualizada para ${email}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[reset-user-password]", error);
  process.exit(1);
});
