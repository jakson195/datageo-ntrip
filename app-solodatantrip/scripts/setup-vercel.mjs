#!/usr/bin/env node
/**
 * One-shot Vercel + Neon setup for datageo-ntrip.
 *
 * Usage (repo root):
 *   vercel link --yes --scope soilsul --project datageo-ntrip
 *   npm run vercel:setup --prefix app-solodatantrip
 *
 * Requires: vercel CLI logged in, team scope soilsul.
 */
import { execSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";

const SCOPE = process.env.VERCEL_SCOPE || "soilsul";
const PROJECT = process.env.VERCEL_PROJECT || "datageo-ntrip";
const PRODUCTION_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.datageontrip.com.br";

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", ...opts });
}

function envExists(name) {
  const result = spawnSync("vercel", ["env", "ls", "production", "--scope", SCOPE], {
    encoding: "utf8",
    shell: true,
  });
  return result.stdout?.includes(name);
}

function addEnv(name, value, environments = "production preview development") {
  if (envExists(name)) {
    console.log(`[setup-vercel] ${name} já existe — pulando`);
    return;
  }
  for (const env of environments.split(/\s+/)) {
    run(
      `echo ${JSON.stringify(value)} | vercel env add ${name} ${env} --scope ${SCOPE} --force`,
      { shell: true },
    );
  }
}

console.log("[setup-vercel] Neon + variáveis do app para", `${SCOPE}/${PROJECT}`);

try {
  run(`vercel integration add neon --scope ${SCOPE} --non-interactive`);
} catch {
  console.log("[setup-vercel] Neon já instalado ou integração existente — continuando");
}

try {
  run(`vercel link --yes --scope ${SCOPE} --project ${PROJECT}`);
} catch {
  console.log("[setup-vercel] Projeto já linkado — continuando");
}

const authSecret = crypto.randomBytes(32).toString("base64");
addEnv("AUTH_SECRET", authSecret);
addEnv("ADMIN_EMAIL", "admin@datageo.com.br");
addEnv("ADMIN_NAME", "Administrador Datageo");
addEnv("ADMIN_PASSWORD", crypto.randomBytes(18).toString("base64url"));
addEnv("NEXT_PUBLIC_APP_URL", PRODUCTION_URL);

console.log("[setup-vercel] Concluído. Faça redeploy em Production no dashboard ou: git push");
console.log("[setup-vercel] Seed admin (uma vez): vercel env pull && npm run db:seed");
