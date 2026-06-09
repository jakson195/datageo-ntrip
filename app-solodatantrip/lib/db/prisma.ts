import "server-only";

import { PrismaClient } from "@prisma/client";
import { applyRuntimeDatabaseUrl } from "./database-env";
import { withDbRetry } from "./with-db-retry";

applyRuntimeDatabaseUrl();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaConnectPromise: Promise<void> | undefined;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/** Ensures a live connection with retry — useful on cold starts (Vercel). */
export async function ensurePrismaConnected(): Promise<void> {
  if (!globalForPrisma.prismaConnectPromise) {
    globalForPrisma.prismaConnectPromise = withDbRetry(
      () => prisma.$connect(),
      "prisma-connect",
    ).catch((error) => {
      globalForPrisma.prismaConnectPromise = undefined;
      throw error;
    });
  }
  await globalForPrisma.prismaConnectPromise;
}
