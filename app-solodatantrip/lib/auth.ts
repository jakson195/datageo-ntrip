import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./auth-constants";
import type { SessionUser } from "./auth-types";
import { getDatabaseConfigStatus } from "./db/is-database-configured";
import { ensurePrismaConnected } from "./db/prisma";
import { mapDbErrorToMessage, withDbRetry } from "./db/with-db-retry";
import { authenticateStoredUser } from "./users-store";
import { createSessionToken, verifySessionToken } from "./session-token";

export { SESSION_COOKIE };
export type { SessionUser, NtripCredentials } from "./auth-types";
export { createSessionToken, verifySessionToken };

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const dbStatus = getDatabaseConfigStatus();
  if (!dbStatus.configured) {
    throw new Error(dbStatus.friendlyError ?? "PostgreSQL não configurado.");
  }

  try {
    await ensurePrismaConnected();
    return await withDbRetry(
      () => authenticateStoredUser(email, password),
      "auth-login",
    );
  } catch (error) {
    throw new Error(mapDbErrorToMessage(error));
  }
}
