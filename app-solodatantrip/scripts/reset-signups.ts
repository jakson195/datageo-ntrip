/**
 * Remove cadastros de usuários (exceto SUPER_ADMIN) para permitir novo signup.
 * Uso: npx tsx scripts/reset-signups.ts
 *      npx tsx scripts/reset-signups.ts --email=user@example.com
 */
import { PrismaClient } from "@prisma/client";
import {
  loadProjectEnvFiles,
  syncDatabaseEnvFromVercelPostgres,
} from "../lib/db/database-env";

loadProjectEnvFiles();
syncDatabaseEnvFromVercelPostgres();

const prisma = new PrismaClient();

function parseEmailArg(): string | null {
  const arg = process.argv.find((a) => a.startsWith("--email="));
  if (!arg) return null;
  return arg.slice("--email=".length).trim().toLowerCase() || null;
}

async function main() {
  const emailFilter = parseEmailArg();

  const users = await prisma.user.findMany({
    where: {
      ...(emailFilter ? { email: emailFilter } : {}),
      role: { not: "SUPER_ADMIN" },
    },
    select: { id: true, email: true, name: true, role: true },
  });

  if (users.length === 0) {
    console.log(
      emailFilter
        ? `Nenhum usuário encontrado para ${emailFilter} (admin preservado).`
        : "Nenhum usuário comum para remover (admin preservado).",
    );
    return;
  }

  const emails = users.map((u) => u.email);
  const ids = users.map((u) => u.id);

  await prisma.trialRegistry.deleteMany({ where: { email: { in: emails } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });

  console.log(`Removidos ${users.length} cadastro(s):`);
  for (const user of users) {
    console.log(`  - ${user.email} (${user.name})`);
  }
  console.log("Pode criar novo cadastro em /cadastro com o mesmo e-mail.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
