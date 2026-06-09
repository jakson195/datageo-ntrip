import "server-only";

import fs from "fs/promises";
import path from "path";

const DATA_DIR =
  process.env.VERCEL === "1"
    ? path.join("/tmp", "datageo-data")
    : path.join(process.cwd(), "data");

const RATE_LIMIT_FILE = path.join(DATA_DIR, "rtk-rate-limit.json");

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

type RateLimitStore = Record<string, RateLimitBucket>;

const memoryStore = new Map<string, RateLimitBucket>();

async function readStore(): Promise<RateLimitStore> {
  try {
    const raw = await fs.readFile(RATE_LIMIT_FILE, "utf-8");
    return JSON.parse(raw) as RateLimitStore;
  } catch {
    return {};
  }
}

async function writeStore(store: RateLimitStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(RATE_LIMIT_FILE, JSON.stringify(store), "utf-8");
}

function pruneStore(store: RateLimitStore, now: number): RateLimitStore {
  const next: RateLimitStore = {};
  for (const [key, bucket] of Object.entries(store)) {
    if (bucket.resetAt > now) next[key] = bucket;
  }
  return next;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export async function checkRateLimit(
  key: string,
  limit = 5,
  windowMs = 15 * 60 * 1000,
): Promise<RateLimitResult> {
  const now = Date.now();
  const memBucket = memoryStore.get(key);

  if (memBucket && memBucket.resetAt > now) {
    if (memBucket.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: memBucket.resetAt };
    }
    memBucket.count += 1;
    memoryStore.set(key, memBucket);
    return {
      allowed: true,
      remaining: limit - memBucket.count,
      resetAt: memBucket.resetAt,
    };
  }

  let store = pruneStore(await readStore(), now);
  let bucket = store[key];

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
  }

  if (bucket.count >= limit) {
    memoryStore.set(key, bucket);
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  store[key] = bucket;
  memoryStore.set(key, bucket);
  await writeStore(store);

  return {
    allowed: true,
    remaining: limit - bucket.count,
    resetAt: bucket.resetAt,
  };
}
