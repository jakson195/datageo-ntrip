import fs from "fs/promises";
import path from "path";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { SessionUser } from "./auth";

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
  streams: number;
  expiryDate: string | null;
  credentialsActive: boolean;
  ntrip: {
    server: string;
    port: string;
    mountpoint: string;
    username: string;
    password: string;
  };
  subscription: {
    plan: string;
    status: "ativo" | "inativo";
    label: string;
  };
}

/** Na Vercel o disco do projeto é só leitura; /tmp permite cadastro como no localhost. */
const DATA_DIR =
  process.env.VERCEL === "1"
    ? path.join("/tmp", "datageo-data")
    : path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const attempt = scryptSync(password, salt, 64).toString("hex");
  try {
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(attempt, "hex"));
  } catch {
    return false;
  }
}

async function readUsers(): Promise<StoredUser[]> {
  try {
    const raw = await fs.readFile(USERS_FILE, "utf-8");
    return JSON.parse(raw) as StoredUser[];
  } catch {
    return [];
  }
}

async function writeUsers(users: StoredUser[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const users = await readUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !password || password.length < 6) {
    return { ok: false, error: "Preencha nome, e-mail e senha (mín. 6 caracteres)." };
  }

  const users = await readUsers();
  if (users.some((u) => u.email === trimmedEmail)) {
    return { ok: false, error: "Este e-mail já está cadastrado." };
  }

  const user: StoredUser = {
    id: randomBytes(8).toString("hex"),
    email: trimmedEmail,
    passwordHash: hashPassword(password),
    name: name.trim(),
    createdAt: new Date().toISOString(),
    streams: 0,
    expiryDate: null,
    credentialsActive: false,
    ntrip: {
      server: process.env.NTRIP_SERVER?.trim() || "sa.geodnet.com",
      port: process.env.NTRIP_PORT?.trim() || "2101",
      mountpoint: process.env.NTRIP_MOUNTPOINT?.trim() || "AUTO",
      username: "NONE",
      password: "NONE",
    },
    subscription: {
      plan: "pendente",
      status: "inativo",
      label: "Aguardando ativação",
    },
  };

  users.push(user);
  await writeUsers(users);
  return { ok: true };
}

export function storedUserToSession(user: StoredUser): SessionUser {
  const inactive = !user.credentialsActive;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    initials: initialsFromName(user.name),
    streams: user.streams,
    expiryDate: user.expiryDate,
    credentialsActive: user.credentialsActive,
    ntrip: {
      server: user.ntrip.server,
      port: user.ntrip.port,
      mountpoint: user.ntrip.mountpoint,
      username: inactive ? "NONE" : user.ntrip.username,
      password: inactive ? "NONE" : user.ntrip.password,
    },
    subscription: user.subscription,
  };
}

export async function authenticateStoredUser(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const user = await findUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  return storedUserToSession(user);
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "DG";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
