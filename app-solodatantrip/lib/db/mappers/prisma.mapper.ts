import type {
  RtkApiMode,
  RtkAuditAction,
  RtkLicense,
  RtkLicenseStatus as PrismaRtkLicenseStatus,
  NtripSubscription,
  Plan,
  SubscriptionStatus,
  TrialRegistryStatus,
  User,
} from "@prisma/client";
import {
  mapPrismaSubscriptionStatusToDto,
  subscriptionStatusLabel,
} from "@/lib/db/repositories/ntrip-subscription.repository";
import type { RtkLicenseStatus } from "@/lib/rtk/license-status";
import type {
  AuditActionDto,
  AuditLogDto,
  RtkLicenseDto,
  UserDto,
} from "@/lib/db/dtos";
import { decryptRtkSecret } from "@/lib/rtk/crypto";

export function prismaLicenseStatusToDto(status: PrismaRtkLicenseStatus): RtkLicenseStatus {
  const map: Record<PrismaRtkLicenseStatus, RtkLicenseStatus> = {
    PENDING: "pending",
    ACTIVE: "active",
    EXPIRED: "expired",
    SUSPENDED: "suspended",
  };
  return map[status];
}

export function dtoLicenseStatusToPrisma(status: RtkLicenseStatus): PrismaRtkLicenseStatus {
  const map: Record<RtkLicenseStatus, PrismaRtkLicenseStatus> = {
    pending: "PENDING",
    active: "ACTIVE",
    expired: "EXPIRED",
    suspended: "SUSPENDED",
  };
  return map[status];
}

export function prismaModeToDto(mode: RtkApiMode): "test" | "production" {
  return mode === "PRODUCTION" ? "production" : "test";
}

export function dtoModeToPrisma(mode: "test" | "production"): RtkApiMode {
  return mode === "production" ? "PRODUCTION" : "TEST";
}

export function prismaSubscriptionToDto(status: SubscriptionStatus): "ativo" | "inativo" {
  return status === "ATIVO" ? "ativo" : "inativo";
}

export function dtoSubscriptionToPrisma(status: "ativo" | "inativo"): SubscriptionStatus {
  return status === "ativo" ? "ATIVO" : "INATIVO";
}

export function prismaAuditActionToDto(action: RtkAuditAction): AuditActionDto {
  const map: Record<RtkAuditAction, AuditActionDto> = {
    LICENSE_CREATE: "license.create",
    LICENSE_RENEW: "license.renew",
    LICENSE_EXPIRE: "license.expire",
    LICENSE_SUSPEND: "license.suspend",
    LICENSE_WEBHOOK: "license.webhook",
  };
  return map[action];
}

export function dtoAuditActionToPrisma(action: AuditActionDto): RtkAuditAction {
  const map: Record<AuditActionDto, RtkAuditAction> = {
    "license.create": "LICENSE_CREATE",
    "license.renew": "LICENSE_RENEW",
    "license.expire": "LICENSE_EXPIRE",
    "license.suspend": "LICENSE_SUSPEND",
    "license.webhook": "LICENSE_WEBHOOK",
  };
  return map[action];
}

export function mapRtkLicenseToDto(license: RtkLicense): RtkLicenseDto {
  return {
    id: license.id,
    licenseId: license.licenseId,
    userId: license.userId,
    plan: license.plan,
    status: prismaLicenseStatusToDto(license.status),
    mode: prismaModeToDto(license.mode),
    expiresAt: license.expiresAt?.toISOString() ?? null,
    credentials: {
      server: license.ntripServer,
      port: license.ntripPort,
      mountpoint: license.ntripMountpoint,
      username: license.ntripUsername,
      password: decryptRtkSecret(license.ntripPasswordEnc),
    },
    isPrimary: license.isPrimary,
    provider: license.provider,
    idempotencyKey: license.idempotencyKey,
    createdAt: license.createdAt.toISOString(),
    updatedAt: license.updatedAt.toISOString(),
  };
}

export function mapUserToDto(
  user: User,
  primaryLicense?: RtkLicense | null,
  entitlement?: (NtripSubscription & { plan: Plan }) | null,
): UserDto {
  const license = primaryLicense ?? null;
  const legacyStatus = prismaSubscriptionToDto(user.subscriptionStatus);
  const subscription = entitlement
    ? {
        plan: entitlement.plan.slug,
        status: mapPrismaSubscriptionStatusToDto(entitlement.status),
        label: subscriptionStatusLabel(entitlement.status, entitlement.plan),
      }
    : {
        plan: user.subscriptionPlan,
        status: (legacyStatus === "ativo" ? "active" : "pending") as UserDto["subscription"]["status"],
        label: user.subscriptionLabel,
      };

  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    streams: user.streams,
    expiryDate: user.expiryDate?.toISOString() ?? null,
    credentialsActive: user.credentialsActive,
    ntrip: {
      server: user.ntripServer,
      port: user.ntripPort,
      mountpoint: user.ntripMountpoint,
      username: user.ntripUsername,
      password: decryptRtkSecret(user.ntripPasswordEnc),
    },
    subscription,
    rtkLicenseId: user.activeLicenseId ?? license?.licenseId ?? null,
    rtkLicense: license
      ? {
          licenseId: license.licenseId,
          plan: license.plan,
          status: prismaLicenseStatusToDto(license.status),
          mode: prismaModeToDto(license.mode),
          expiresAt: license.expiresAt?.toISOString() ?? null,
        }
      : null,
  };
}

export function mapAuditLogToDto(log: {
  id: string;
  action: RtkAuditAction;
  userId: string;
  userEmail: string;
  licenseId: string | null;
  ip: string;
  metadata: unknown;
  createdAt: Date;
}): AuditLogDto {
  return {
    id: log.id,
    action: prismaAuditActionToDto(log.action),
    userId: log.userId,
    userEmail: log.userEmail,
    licenseId: log.licenseId,
    ip: log.ip,
    metadata: (log.metadata as Record<string, unknown> | null) ?? null,
    createdAt: log.createdAt.toISOString(),
  };
}

export function mapTrialStatusToDto(status: TrialRegistryStatus): string {
  return status.toLowerCase();
}
