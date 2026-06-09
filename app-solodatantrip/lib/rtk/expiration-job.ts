import "server-only";

import { prisma } from "@/lib/db/prisma";
import { userRepository } from "@/lib/db/repositories/user.repository";
import { rtkLicenseRepository } from "@/lib/db/repositories/rtk-license.repository";
import { appendRtkAuditLog } from "./audit-log";
import { buildWebhookEvent, rtkWebhookRegistry } from "./webhooks";
import { dtoSubscriptionToPrisma } from "@/lib/db/mappers/prisma.mapper";

export interface RtkExpirationJobResult {
  checked: number;
  expired: number;
  licenseIds: string[];
}

import { ntripSubscriptionActivationService } from "@/lib/ntrip/subscription-activation.service";

export async function runRtkExpirationJob(): Promise<RtkExpirationJobResult> {
  const entitlementExpired = await ntripSubscriptionActivationService.expireDueSubscriptions();
  const expiredLicenses = await rtkLicenseRepository.markExpiredLicenses();
  const licenseIds = expiredLicenses.map((l) => l.licenseId);

  for (const license of expiredLicenses) {
    await prisma.user.updateMany({
      where: {
        id: license.userId,
        activeLicenseId: license.licenseId,
        deletedAt: null,
      },
      data: {
        credentialsActive: false,
        streams: 0,
        subscriptionStatus: dtoSubscriptionToPrisma("inativo"),
        subscriptionLabel: "Licença expirada",
        ntripUsername: "NONE",
        ntripPasswordEnc: "NONE",
      },
    });

    const user = await userRepository.findById(license.userId);
    if (!user) continue;

    await appendRtkAuditLog({
      action: "license.expire",
      userId: user.id,
      userEmail: user.email,
      licenseId: license.licenseId,
      ip: "cron",
      metadata: { source: "rtk-expiration-job" },
    });

    await rtkWebhookRegistry.dispatch(
      buildWebhookEvent("license.expired", {
        licenseId: license.licenseId,
        userEmail: user.email,
        plan: license.plan,
        status: "expired",
        expiresAt: license.expiresAt ?? new Date().toISOString(),
      }),
    );
  }

  const checked = await userRepository.countActive();

  return {
    checked,
    expired: expiredLicenses.length + entitlementExpired,
    licenseIds,
  };
}

export async function suspendRtkLicense(
  userId: string,
  reason?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await userRepository.findById(userId);
  if (!user) return { ok: false, error: "Usuário não encontrado." };

  const licenseId = user.rtkLicenseId ?? user.rtkLicense?.licenseId;
  if (!licenseId) return { ok: false, error: "Usuário sem licença RTK." };

  await rtkLicenseRepository.updateByLicenseId(licenseId, { status: "suspended" });

  await prisma.user.update({
    where: { id: userId },
    data: {
      credentialsActive: false,
      streams: 0,
      subscriptionStatus: dtoSubscriptionToPrisma("inativo"),
      subscriptionLabel: "Licença suspensa",
      ntripUsername: "NONE",
      ntripPasswordEnc: "NONE",
    },
  });

  await rtkWebhookRegistry.dispatch(
    buildWebhookEvent("license.suspended", {
      licenseId,
      userEmail: user.email,
      plan: user.rtkLicense?.plan ?? user.subscription.plan,
      status: "suspended",
      reason,
    }),
  );

  return { ok: true };
}
