import { Prisma } from "@prisma/client";
import { DB_RETRY_BASE_DELAY_MS, DB_RETRY_MAX_ATTEMPTS } from "./database-env";

const TRANSIENT_PRISMA_CODES = new Set(["P1001", "P1002", "P1008", "P1017", "P2024"]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isTransientDbError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return TRANSIENT_PRISMA_CODES.has(error.code);
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("connect") ||
      message.includes("timeout") ||
      message.includes("econnrefused") ||
      message.includes("connection terminated") ||
      message.includes("can't reach database")
    );
  }

  return false;
}

export function mapDbErrorToMessage(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P1001") {
      return "Não foi possível conectar ao PostgreSQL. Verifique DATABASE_URL e DIRECT_URL.";
    }
    if (error.code === "P1008") {
      return "Conexão com o banco expirou. Tente novamente em instantes.";
    }
    if (error.code === "P2024") {
      return "Pool de conexões ocupado. Aguarde e tente novamente.";
    }
  }

  if (error instanceof Error && isTransientDbError(error)) {
    return "Banco de dados temporariamente indisponível. Tente novamente.";
  }

  return "Erro ao acessar o banco de dados. Tente novamente.";
}

export async function withDbRetry<T>(
  operation: () => Promise<T>,
  label = "db",
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= DB_RETRY_MAX_ATTEMPTS; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientDbError(error) || attempt === DB_RETRY_MAX_ATTEMPTS) {
        throw error;
      }
      console.warn(`[${label}] tentativa ${attempt}/${DB_RETRY_MAX_ATTEMPTS} falhou`, error);
      await sleep(DB_RETRY_BASE_DELAY_MS * attempt);
    }
  }

  throw lastError;
}
