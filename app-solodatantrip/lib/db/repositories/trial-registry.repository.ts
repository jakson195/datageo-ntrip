import "server-only";

import { prisma } from "@/lib/db/prisma";
import { resolveLicenseStatus } from "@/lib/rtk/license-status";
import type { UserDto } from "@/lib/db/dtos";

const notDeleted = { deletedAt: null } as const;

export class TrialRegistryRepository {
  async emailHasActiveTrial(email: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    const entry = await prisma.trialRegistry.findFirst({
      where: { email: normalized, status: "ACTIVE", ...notDeleted },
    });
    return Boolean(entry);
  }

  async registerTrial(params: {
    email: string;
    userId: string;
    licenseId: string;
  }): Promise<void> {
    const normalized = params.email.trim().toLowerCase();
    await prisma.trialRegistry.upsert({
      where: { email: normalized },
      create: {
        email: normalized,
        userId: params.userId,
        licenseId: params.licenseId,
        status: "ACTIVE",
      },
      update: {
        userId: params.userId,
        licenseId: params.licenseId,
        status: "ACTIVE",
        deletedAt: null,
      },
    });
  }

  async consumeTrial(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    await prisma.trialRegistry.updateMany({
      where: { email: normalized, ...notDeleted },
      data: { status: "CONSUMED" },
    });
  }

  async revokeTrial(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    await prisma.trialRegistry.updateMany({
      where: { email: normalized, ...notDeleted },
      data: { status: "REVOKED" },
    });
  }

  userHasActiveTrial(user: UserDto): boolean {
    const plan = user.rtkLicense?.plan ?? user.subscription.plan;
    if (plan !== "trial") return false;

    // Cadastro sem provisionamento (ex.: banco offline no signup) — pode ativar depois.
    if (!user.credentialsActive || user.ntrip.username === "NONE") {
      return false;
    }

    const status = resolveLicenseStatus({
      status: user.rtkLicense?.status,
      expiresAt: user.rtkLicense?.expiresAt ?? user.expiryDate,
      credentialsActive: user.credentialsActive,
    });

    return status === "active" || status === "pending";
  }

  assertTrialNotDuplicated(
    user: UserDto,
    plan: string,
  ): { ok: true } | { ok: false; error: string } {
    if (plan !== "trial") return { ok: true };

    if (this.userHasActiveTrial(user)) {
      return {
        ok: false,
        error: "Este e-mail já possui uma licença trial RTK ativa ou pendente.",
      };
    }

    return { ok: true };
  }
}

export const trialRegistryRepository = new TrialRegistryRepository();
