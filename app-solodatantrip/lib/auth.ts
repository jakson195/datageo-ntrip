import crypto from "crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./auth-constants";
import { authenticateStoredUser } from "./users-store";

export { SESSION_COOKIE };

export interface NtripCredentials {
  server: string;
  port: string;
  mountpoint: string;
  username: string;
  password: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  initials: string;
  ntrip: NtripCredentials;
  subscription: {
    plan: string;
    status: "ativo" | "inativo";
    label: string;
  };
  streams: number;
  expiryDate: string | null;
  credentialsActive: boolean;
}

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

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

function buildDemoUser(): SessionUser {
  const demoEmail = process.env.DEMO_LOGIN_EMAIL?.trim() || "cliente@datageo.com.br";
  const name = process.env.DEMO_USER_NAME?.trim() || "Cliente Datageo";

  return {
    id: "demo-1",
    email: demoEmail,
    name,
    initials: initialsFromName(name),
    streams: 1,
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    credentialsActive: true,
    ntrip: {
      server: process.env.NTRIP_SERVER?.trim() || "sa.geodnet.com",
      port: process.env.NTRIP_PORT?.trim() || "2101",
      mountpoint: process.env.NTRIP_MOUNTPOINT?.trim() || "AUTO",
      username: process.env.NTRIP_USERNAME?.trim() || "jaksonn",
      password: process.env.NTRIP_PASSWORD?.trim() || "senha_demo",
    },
    subscription: {
      plan: "teste",
      status: "ativo",
      label: process.env.DEMO_SUBSCRIPTION_LABEL?.trim() || "Conta teste",
    },
  };
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const demoEmail = process.env.DEMO_LOGIN_EMAIL?.trim() || "cliente@datageo.com.br";
  const demoPassword = process.env.DEMO_LOGIN_PASSWORD?.trim() || "demo123";

  if (email.toLowerCase() === demoEmail.toLowerCase() && password === demoPassword) {
    return buildDemoUser();
  }

  return authenticateStoredUser(email, password);
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "DG";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
