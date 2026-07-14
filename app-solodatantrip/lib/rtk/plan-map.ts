import "server-only";

/** Slugs internos (pt-BR) → planos aceitos pela Shop API RTKdata. */
const PLAN_MAP: Record<string, string> = {
  trial: "trial",
  mensal: "monthly",
  monthly: "monthly",
  trimestral: "monthly",
  quarterly: "monthly",
  anual: "annual",
  annual: "annual",
};

const RTK_API_PLANS = new Set(["trial", "monthly", "annual"]);

export function mapPlanSlugToRtkApi(slug: string): string | null {
  const normalized = slug.trim().toLowerCase();
  const mapped = PLAN_MAP[normalized];
  if (mapped && RTK_API_PLANS.has(mapped)) return mapped;
  return null;
}

export function isRtkProvisionablePlan(slug: string): boolean {
  return mapPlanSlugToRtkApi(slug) !== null;
}
