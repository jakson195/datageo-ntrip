/** Trial gratuito — duração padrão alinhada ao marketing (30 dias). */
export const TRIAL_PLAN_SLUG = "trial";

export function getTrialDurationDays(fallback = 30): number {
  const raw = process.env.TRIAL_DURATION_DAYS?.trim();
  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return fallback;
}

export function trialSubscriptionLabel(): string {
  return `Trial grátis · ${getTrialDurationDays()} dias`;
}

export function isTrialPlan(slug: string): boolean {
  return slug.trim().toLowerCase() === TRIAL_PLAN_SLUG;
}
