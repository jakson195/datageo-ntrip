#!/usr/bin/env node
/**
 * Sync selected vars from .env.local to Vercel (production + preview + development).
 * Skips local-only and vars already managed on Vercel (DB, auth, app URL).
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const SCOPE = process.env.VERCEL_SCOPE || "soilsul";
const envPath = new URL("../.env.local", import.meta.url);
const raw = readFileSync(envPath, "utf8");
const map = {};

for (const line of raw.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !m[1].startsWith("NODE_")) map[m[1]] = m[2];
}

const skip = new Set([
  "DATABASE_URL",
  "DIRECT_URL",
  "AUTH_SECRET",
  "ADMIN_PASSWORD",
  "ADMIN_EMAIL",
  "ADMIN_NAME",
  "NEXT_PUBLIC_APP_URL",
]);

const ls = spawnSync("vercel", ["env", "ls", "production", "--scope", SCOPE], {
  encoding: "utf8",
  shell: true,
});
const existing = ls.stdout || "";

for (const [name, value] of Object.entries(map)) {
  if (skip.has(name) || existing.includes(name)) {
    console.log(`[sync-vercel-env] skip ${name}`);
    continue;
  }
  console.log(`[sync-vercel-env] add ${name}`);
  for (const env of ["production", "preview", "development"]) {
    const r = spawnSync(
      "vercel",
      ["env", "add", name, env, "--scope", SCOPE, "--force"],
      { input: value, shell: true, encoding: "utf8" },
    );
    if (r.status !== 0) {
      console.error(`[sync-vercel-env] failed ${name} (${env})`);
      process.exit(1);
    }
  }
}

console.log("[sync-vercel-env] done");
