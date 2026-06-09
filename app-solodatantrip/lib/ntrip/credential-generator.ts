import { randomBytes, randomUUID } from "crypto";
import type { Plan } from "@prisma/client";
import { getTrialDurationDays, isTrialPlan } from "@/lib/ntrip/trial-config";

function defaultCasterHost(): string {
  return process.env.NTRIP_SERVER?.trim() || "sa.geodnet.com";
}

function defaultCasterPort(): string {
  return process.env.NTRIP_PORT?.trim() || "2101";
}

function defaultMountpoint(): string {
  return process.env.NTRIP_MOUNTPOINT?.trim() || "AUTO";
}

function defaultMode(): "test" | "production" {
  const raw = process.env.RTK_API_MODE?.trim().toLowerCase();
  return raw === "production" || raw === "prod" ? "production" : "test";
}

function sanitizeUsernamePart(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "").slice(0, 12).toLowerCase() || "user";
}

export function generateLocalNtripLicense(
  email: string,
  plan: Pick<Plan, "slug" | "durationDays">,
) {
  const localPart = sanitizeUsernamePart(email.split("@")[0] ?? "user");
  const suffix = randomBytes(3).toString("hex");
  const username = `dg_${localPart}_${suffix}`;
  const password = randomBytes(9).toString("base64url").slice(0, 12);
  const durationDays = isTrialPlan(plan.slug)
    ? getTrialDurationDays(plan.durationDays)
    : plan.durationDays;
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  return {
    licenseId: `local-${randomUUID()}`,
    plan: plan.slug,
    status: "active" as const,
    mode: defaultMode(),
    expiresAt: expiresAt.toISOString(),
    credentials: {
      server: defaultCasterHost(),
      port: defaultCasterPort(),
      mountpoint: defaultMountpoint(),
      username,
      password,
    },
  };
}
