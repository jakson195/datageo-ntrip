import "server-only";

import { trialRegistryRepository } from "@/lib/db/repositories/trial-registry.repository";
import type { UserDto } from "@/lib/db/dtos";

export async function emailHasTrialLicense(email: string): Promise<boolean> {
  return trialRegistryRepository.emailHasActiveTrial(email);
}

export function userHasActiveTrial(user: UserDto): boolean {
  return trialRegistryRepository.userHasActiveTrial(user);
}

export function assertTrialNotDuplicated(
  user: UserDto,
  plan: string,
): { ok: true } | { ok: false; error: string } {
  return trialRegistryRepository.assertTrialNotDuplicated(user, plan);
}

export type { UserDto as StoredUser } from "@/lib/db/dtos";
