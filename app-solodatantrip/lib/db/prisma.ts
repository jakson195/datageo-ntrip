import "server-only";

import { PrismaClient } from "@prisma/client";
import { applyRuntimeDatabaseUrl } from "./database-env";
import { isTransientDbError, withDbRetry } from "./with-db-retry";

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

function isClosedConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("closed") || message.includes("connection terminated");
}

/** Ensures a live connection with retry — reconnects if Neon/Supabase idle-closed the socket. */
export async function ensurePrismaConnected(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return;
  } catch (error) {
    if (!isClosedConnectionError(error) && !isTransientDbError(error)) {
      throw error;
    }
    globalForPrisma.prismaConnectPromise = undefined;
    try {
      await prisma.$disconnect();
    } catch {
      // ignore disconnect errors on stale client
    }
  }

  if (!globalForPrisma.prismaConnectPromise) {
    globalForPrisma.prismaConnectPromise = withDbRetry(
      async () => {
        await prisma.$connect();
        await prisma.$queryRaw`SELECT 1`;
      },
      "prisma-connect",
    ).catch((error) => {
      globalForPrisma.prismaConnectPromise = undefined;
      throw error;
    });
  }
  await globalForPrisma.prismaConnectPromise;
}
