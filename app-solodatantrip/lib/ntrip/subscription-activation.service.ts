import { createHash } from "crypto";
import type { ActivationSource } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { planRepository } from "@/lib/db/repositories/plan.repository";
import { userRepository } from "@/lib/db/repositories/user.repository";
import {
  mapPrismaSubscriptionStatusToDto,
  ntripAccountRepository,
  ntripSubscriptionRepository,
  subscriptionStatusLabel,
} from "@/lib/db/repositories/ntrip-subscription.repository";
import { appendRtkAuditLog } from "@/lib/rtk/audit-log";
import { rtkProviderService } from "@/lib/rtk/providers/rtk-provider-service";
import type { RtkLicenseRecord } from "@/lib/rtk/types";
import { encryptRtkSecret } from "@/lib/rtk/crypto";
import { saveRtkLicenseForUser } from "@/lib/users-store";
import { generateLocalNtripLicense } from "@/lib/ntrip/credential-generator";
import { isTrialPlan, trialSubscriptionLabel } from "@/lib/ntrip/trial-config";

export type ActivateSubscriptionInput = {
  userId: string;
  planSlug: string;
  source: ActivationSource;
  billingSubscriptionId?: string;
  idempotencyKey?: string;
  actorEmail?: string;
  ip?: string;
};

export type ActivateSubscriptionResult =
  | { ok: true; subscriptionId: string; licenseId: string }
  | { ok: false; error: string };

function buildIdempotencyKey(userId: string, planSlug: string, source: ActivationSource): string {
  return createHash("sha256")
    .update(`${userId}:${planSlug}:${source}`)
    .digest("hex")
    .slice(0, 24);
}

async function resolveLicenseRecord(
  input: ActivateSubscriptionInput,
  user: { name: string; email: string },
  plan: { slug: string; durationDays: number },
): Promise<{ ok: true; license: RtkLicenseRecord } | { ok: false; error: string }> {
  // Trial no cadastro: credenciais locais imediatas (+30 dias do plano)
  if (input.source === "TRIAL" || isTrialPlan(plan.slug)) {
    return { ok: true, license: generateLocalNtripLicense(user.email, plan) };
  }

  if (rtkProviderService.isConfigured()) {
    const provisioned = await rtkProviderService.createLicense(
      user.name,
      user.email,
      plan.slug,
      input.idempotencyKey ?? buildIdempotencyKey(input.userId, plan.slug, input.source),
    );
    if (!provisioned.ok) {
      return { ok: false, error: provisioned.error };
    }
    return { ok: true, license: provisioned.data };
  }

  return { ok: true, license: generateLocalNtripLicense(user.email, plan) };
}

export class NtripSubscriptionActivationService {
  async createPendingSubscription(
    userId: string,
    planSlug: string,
    source: ActivationSource,
    billingSubscriptionId?: string,
  ): Promise<string> {
    const plan = await planRepository.findBySlug(planSlug);
    if (!plan) throw new Error(`Plano "${planSlug}" não encontrado.`);

    const existing = await ntripSubscriptionRepository.findLatestByUserId(userId);
    if (existing?.status === "PENDING") return existing.id;

    const created = await ntripSubscriptionRepository.createPending({
      userId,
      planId: plan.id,
      source,
      billingSubscriptionId,
    });
    return created.id;
  }

  async activateSubscription(
    input: ActivateSubscriptionInput,
  ): Promise<ActivateSubscriptionResult> {
    const user = await userRepository.findById(input.userId);
    if (!user) return { ok: false, error: "Usuário não encontrado." };

    const plan = await planRepository.findBySlug(input.planSlug);
    if (!plan) return { ok: false, error: `Plano "${input.planSlug}" não encontrado.` };

    const licenseResult = await resolveLicenseRecord(input, user, plan);
    if (!licenseResult.ok) return licenseResult;

    const license = licenseResult.license;
    const now = new Date();
    const expiresAt = license.expiresAt
      ? new Date(license.expiresAt)
      : new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    let subscription = await ntripSubscriptionRepository.findLatestByUserId(input.userId);
    if (!subscription || subscription.status === "EXPIRED") {
      subscription = await ntripSubscriptionRepository.createPending({
        userId: input.userId,
        planId: plan.id,
        source: input.source,
        billingSubscriptionId: input.billingSubscriptionId,
      });
    }

    await ntripAccountRepository.deactivatePrimaryForUser(input.userId);

    const saved = await saveRtkLicenseForUser(input.userId, {
      ...license,
      expiresAt: expiresAt.toISOString(),
      status: "active",
    });
    if (!saved.ok) return { ok: false, error: saved.error };

    await ntripSubscriptionRepository.markActive(subscription.id, {
      startsAt: now,
      expiresAt,
      activatedAt: now,
    });

    await ntripAccountRepository.create({
      userId: input.userId,
      subscriptionId: subscription.id,
      rtkLicenseId: license.licenseId,
      host: license.credentials.server,
      port: license.credentials.port,
      mountpoint: license.credentials.mountpoint,
      username: license.credentials.username,
      passwordEnc:
        license.credentials.password === "NONE"
          ? "NONE"
          : encryptRtkSecret(license.credentials.password),
      status: "ACTIVE",
      expiresAt,
      isPrimary: true,
    });

    await appendRtkAuditLog({
      action: "license.create",
      userId: input.userId,
      userEmail: user.email,
      licenseId: license.licenseId,
      ip: input.ip ?? "activation-service",
      metadata: {
        source: input.source,
        planSlug: plan.slug,
        actorEmail: input.actorEmail,
        billingSubscriptionId: input.billingSubscriptionId,
      },
    });

    return { ok: true, subscriptionId: subscription.id, licenseId: license.licenseId };
  }

  async activateTrialOnSignup(userId: string): Promise<ActivateSubscriptionResult> {
    return this.activateSubscription({
      userId,
      planSlug: "trial",
      source: "TRIAL",
      idempotencyKey: buildIdempotencyKey(userId, "trial", "TRIAL"),
      ip: "registration",
    });
  }

  async activateAfterPayment(
    userId: string,
    planSlug: string,
    billingSubscriptionId?: string,
    source: ActivationSource = "STRIPE",
  ): Promise<ActivateSubscriptionResult> {
    return this.activateSubscription({
      userId,
      planSlug,
      source,
      billingSubscriptionId,
      idempotencyKey: billingSubscriptionId
        ? `pay-${billingSubscriptionId}`
        : buildIdempotencyKey(userId, planSlug, source),
      ip: "billing-webhook",
    });
  }

  async activateManual(
    userId: string,
    planSlug: string,
    actorEmail: string,
  ): Promise<ActivateSubscriptionResult> {
    return this.activateSubscription({
      userId,
      planSlug,
      source: "MANUAL",
      actorEmail,
      ip: "admin-manual",
    });
  }

  async suspendSubscription(
    userId: string,
    reason: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const subscription = await ntripSubscriptionRepository.findLatestByUserId(userId);
    if (!subscription) return { ok: false, error: "Assinatura não encontrada." };

    await ntripSubscriptionRepository.markSuspended(subscription.id);
    await ntripAccountRepository.markSuspendedForSubscription(subscription.id);

    const user = await userRepository.findById(userId);
    if (user) {
      await appendRtkAuditLog({
        action: "license.suspend",
        userId,
        userEmail: user.email,
        licenseId: user.rtkLicenseId ?? null,
        ip: "activation-service",
        metadata: { reason },
      });
    }

    return { ok: true };
  }

  async expireDueSubscriptions(): Promise<number> {
    const due = await ntripSubscriptionRepository.findExpiredActive();
    for (const row of due) {
      await ntripSubscriptionRepository.markExpired(row.id);
      await ntripAccountRepository.markExpiredForSubscription(row.id);
      await this.blockUserAccess(row.userId, "Trial expirado");
    }
    return due.length;
  }

  async blockUserAccess(userId: string, label = "Assinatura expirada"): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) return;

    const licenseId = user.rtkLicenseId ?? user.rtkLicense?.licenseId;
    if (licenseId) {
      await prisma.rtkLicense.updateMany({
        where: { licenseId, userId, deletedAt: null },
        data: { status: "EXPIRED" },
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        credentialsActive: false,
        streams: 0,
        subscriptionStatus: "INATIVO",
        subscriptionLabel: label,
        ntripUsername: "NONE",
        ntripPasswordEnc: "NONE",
      },
    });
  }
}

export const ntripSubscriptionActivationService = new NtripSubscriptionActivationService();

export function resolveUserSubscriptionFromEntitlement(
  entitlement: Awaited<ReturnType<typeof ntripSubscriptionRepository.findLatestByUserId>>,
  fallback: { plan: string; status: "ativo" | "inativo"; label: string },
): {
  plan: string;
  status: "pending" | "active" | "suspended" | "expired";
  label: string;
} {
  if (!entitlement) {
    return {
      plan: fallback.plan,
      status: fallback.status === "ativo" ? "active" : "pending",
      label: fallback.label,
    };
  }

  return {
    plan: entitlement.plan.slug,
    status: mapPrismaSubscriptionStatusToDto(entitlement.status),
    label: subscriptionStatusLabel(entitlement.status, entitlement.plan),
  };
}
