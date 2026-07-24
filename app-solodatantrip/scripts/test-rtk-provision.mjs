/**
 * Diagnóstico RTKdata Shop API (Rita Santos).
 *
 * Uso:
 *   node scripts/test-rtk-provision.mjs           # teste vazio (espera HTTP 422)
 *   node scripts/test-rtk-provision.mjs --full    # provisionamento completo (sandbox/test)
 *
 * Interpretação:
 *   HTTP 422 → chave e ligação OK; body inválido (esperado no teste vazio)
 *   HTTP 401 → chave errada
 *   Erro de rede → URL ou firewall
 */
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const mode = (process.env.RTK_API_MODE ?? "sandbox").trim().toLowerCase();
const isProd = mode === "production" || mode === "prod";
const key = isProd
  ? (process.env.RTK_API_KEY_PRODUCTION ?? process.env.RTK_API_KEY_LIVE ?? "").trim()
  : (process.env.RTK_API_KEY_TEST ?? process.env.RTK_API_KEY ?? "").trim();
const base = (
  process.env.RTK_API_BASE_URL ?? "https://rtkdata-reseller-1.onrender.com/api/v1"
).replace(/\/$/, "");

if (!key) {
  console.error(`Chave RTK ausente para modo "${mode}".`);
  process.exit(1);
}

const full = process.argv.includes("--full");
const body = full
  ? {
      plan: "monthly",
      idempotency_key: `diag-${Date.now()}`,
      username: `dg_diag_${Date.now().toString(36).slice(-6)}`,
      customer: { email: "diag@datageontrip.com.br", country: "BR" },
      max_connections: 1,
    }
  : {};

console.log(`mode=${mode} key=${key.slice(0, 12)}… endpoint=${base}/provision`);
console.log(full ? "POST provision (payload completo)" : "POST provision (body vazio — teste Rita)");

const res = await fetch(`${base}/provision`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

console.log(`HTTP ${res.status} ${res.statusText}`);
const json = await res.json().catch(() => null);
if (json) {
  if (full && json.credentials) {
    console.log("ok:", json.ok, "license_id:", json.license_id);
    console.log("username:", json.credentials.username);
    console.log("password:", json.credentials.password ? "[definida]" : "[ausente]");
    console.log("server:", json.credentials.server, "port:", json.credentials.port);
  } else {
    console.log(JSON.stringify(json, null, 2));
  }
}
