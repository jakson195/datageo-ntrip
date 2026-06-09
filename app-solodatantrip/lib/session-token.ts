import crypto from "crypto";
import type { SessionUser } from "@/lib/auth-types";

const SESSION_DAYS = 7;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET deve ter pelo menos 16 caracteres em produção.");
    }
    return "dev-only-auth-secret-change-me";
  }
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createSessionToken(user: SessionUser): string {
  const body = {
    ...user,
    exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  };
  const payload = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string): SessionUser | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (sig !== sign(payload)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as SessionUser & {
      exp?: number;
    };
    if (!data.exp || data.exp < Date.now()) return null;
    if (!data.email || !data.ntrip) return null;
    return data;
  } catch {
    return null;
  }
}
