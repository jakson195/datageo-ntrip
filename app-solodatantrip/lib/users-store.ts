import "server-only";

import {
  rtkLicenseRepository,
  trialRegistryRepository,
  userRepository,
  type UserDto,
} from "@/lib/db";
import { ntripSubscriptionActivationService } from "@/lib/ntrip/subscription-activation.service";
import { trialSubscriptionLabel } from "@/lib/ntrip/trial-config";
import { maskRtkPassword } from "@/lib/rtk/crypto";
import { resolveLicenseStatus } from "@/lib/rtk/license-status";
import type { SessionUser } from "@/lib/auth-types";
import type { RtkLicenseRecord } from "@/lib/rtk/types";
import { prisma } from "@/lib/db/prisma";
import {
  dtoLicenseStatusToPrisma,
  dtoModeToPrisma,
  dtoSubscriptionToPrisma,
} from "@/lib/db/mappers/prisma.mapper";
import { encryptRtkSecret } from "@/lib/rtk/crypto";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  validateEmail,
  validateName,
  validatePassword,
} from "@/lib/password-validation";

function buildSubscriptionFromLicense(license: RtkLicenseRecord) {
  const active = license.status === "active";
  return {
    plan: license.plan,
    status: active ? ("ativo" as const) : ("inativo" as const),
    label:
      license.plan === "trial"
        ? trialSubscriptionLabel()
        : `Plano ${license.plan}`,
  };
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const nameCheck = validateName(name);
  if (!nameCheck.ok) return nameCheck;

  const emailCheck = validateEmail(email);
  if (!emailCheck.ok) return emailCheck;

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.ok) return passwordCheck;

  const trimmedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  if (await userRepository.emailExists(trimmedEmail)) {
    return { ok: false, error: "Este e-mail já está cadastrado." };
  }

  const user = await userRepository.create({
    email: trimmedEmail,
    passwordHash: await hashPassword(password),
    name: trimmedName,
    streams: 0,
    expiryDate: null,
    credentialsActive: false,
    ntrip: {
      server: process.env.NTRIP_SERVER?.trim() || "sa.geodnet.com",
      port: process.env.NTRIP_PORT?.trim() || "2101",
      mountpoint: process.env.NTRIP_MOUNTPOINT?.trim() || "AUTO",
      username: "NONE",
      password: "NONE",
    },
    subscription: {
      plan: "trial",
      status: "inativo",
      label: "Aguardando ativação",
    },
  });

  const activation = await ntripSubscriptionActivationService.activateTrialOnSignup(user.id);
  if (!activation.ok) {
    await prisma.user.update({
      where: { id: user.id },
      data: { deletedAt: new Date() },
    });
    return { ok: false, error: activation.error || "Não foi possível ativar o trial NTRIP." };
  }

  await trialRegistryRepository.registerTrial({
    email: trimmedEmail,
    userId: user.id,
    licenseId: activation.licenseId,
  });

  return { ok: true };
}

export async function saveRtkLicenseForUser(
  userId: string,
  license: RtkLicenseRecord,
): Promise<{ ok: true; user: UserDto } | { ok: false; error: string }> {
  const existing = await userRepository.findById(userId);
  if (!existing) {
    return { ok: false, error: "Usuário não encontrado." };
  }

  await persistLicenseForUser(userId, license, { isPrimary: true });

  const active = license.status === "active";
  const resolvedStatus = resolveLicenseStatus({
    status: license.status,
    expiresAt: license.expiresAt,
    credentialsActive: active,
  });

  const updated = await userRepository.update(userId, {
    credentialsActive: active && resolvedStatus === "active",
    streams: active && resolvedStatus === "active" ? 1 : 0,
    expiryDate: license.expiresAt ? new Date(license.expiresAt) : null,
    activeLicenseId: license.licenseId,
    ntrip: license.credentials,
    subscription: buildSubscriptionFromLicense(license),
  });

  if (license.plan === "trial" && resolvedStatus === "active") {
    await trialRegistryRepository.registerTrial({
      email: updated.email,
      userId: updated.id,
      licenseId: license.licenseId,
    });
  }

  return { ok: true, user: updated };
}

async function persistLicenseForUser(
  userId: string,
  license: RtkLicenseRecord,
  options: { isPrimary: boolean },
): Promise<void> {
  const existing = await rtkLicenseRepository.findByLicenseId(license.licenseId);

  if (existing) {
    await rtkLicenseRepository.updateByLicenseId(license.licenseId, {
      status: resolveLicenseStatus({
        status: license.status,
        expiresAt: license.expiresAt,
        credentialsActive: license.status === "active",
      }),
      expiresAt: license.expiresAt ? new Date(license.expiresAt) : null,
      isPrimary: options.isPrimary,
      credentials: license.credentials,
    });
  } else {
    await rtkLicenseRepository.create({
      licenseId: license.licenseId,
      userId,
      plan: license.plan,
      status: resolveLicenseStatus({
        status: license.status,
        expiresAt: license.expiresAt,
        credentialsActive: license.status === "active",
      }),
      mode: license.mode,
      expiresAt: license.expiresAt ? new Date(license.expiresAt) : null,
      credentials: license.credentials,
      isPrimary: options.isPrimary,
    });
  }

  if (options.isPrimary) {
    await rtkLicenseRepository.setPrimary(userId, license.licenseId);
    await prisma.user.update({
      where: { id: userId },
      data: {
        activeLicenseId: license.licenseId,
        ntripServer: license.credentials.server,
        ntripPort: license.credentials.port,
        ntripMountpoint: license.credentials.mountpoint,
        ntripUsername: license.credentials.username,
        ntripPasswordEnc:
          license.credentials.password === "NONE"
            ? "NONE"
            : encryptRtkSecret(license.credentials.password),
        subscriptionPlan: license.plan,
        subscriptionStatus: dtoSubscriptionToPrisma(
          license.status === "active" ? "ativo" : "inativo",
        ),
        subscriptionLabel:
          license.plan === "trial"
            ? trialSubscriptionLabel()
            : `Plano ${license.plan}`,
        expiryDate: license.expiresAt ? new Date(license.expiresAt) : null,
        credentialsActive: license.status === "active",
        streams: license.status === "active" ? 1 : 0,
      },
    });

    await prisma.rtkLicense.updateMany({
      where: {
        userId,
        licenseId: license.licenseId,
        deletedAt: null,
      },
      data: {
        status: dtoLicenseStatusToPrisma(
          resolveLicenseStatus({
            status: license.status,
            expiresAt: license.expiresAt,
            credentialsActive: license.status === "active",
          }),
        ),
        mode: dtoModeToPrisma(license.mode),
      },
    });
  }
}

export async function findUserByEmail(email: string): Promise<UserDto | null> {
  return userRepository.findByEmail(email);
}

export async function findStoredUserById(userId: string): Promise<UserDto | null> {
  return userRepository.findById(userId);
}

export async function readAllStoredUsers(): Promise<UserDto[]> {
  return userRepository.findAllActive();
}

export function storedUserToSession(user: UserDto): SessionUser {
  return buildSessionUser(user, { revealPassword: false });
}

/** Painel do cliente — credenciais completas quando a assinatura está ativa. */
export function userDtoToDashboardSession(user: UserDto): SessionUser {
  return buildSessionUser(user, { revealPassword: user.credentialsActive });
}

function buildSessionUser(
  user: UserDto,
  options: { revealPassword: boolean },
): SessionUser {
  const inactive = !user.credentialsActive;
  const plainPassword = inactive ? "NONE" : user.ntrip.password;
  const subStatus = user.subscription.status;
  const normalizedStatus =
    subStatus === "ativo"
      ? "active"
      : subStatus === "inativo"
        ? "pending"
        : subStatus;

  const expiryMs = user.expiryDate ? new Date(user.expiryDate).getTime() : null;
  const isPastExpiry = expiryMs !== null && expiryMs < Date.now();
  const effectiveStatus =
    isPastExpiry && normalizedStatus === "active" ? "expired" : normalizedStatus;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    initials: initialsFromName(user.name),
    streams: user.streams,
    expiryDate: user.expiryDate,
    credentialsActive: user.credentialsActive && !isPastExpiry,
    ntrip: {
      server: user.ntrip.server,
      port: user.ntrip.port,
      mountpoint: user.ntrip.mountpoint,
      username: inactive || isPastExpiry ? "NONE" : user.ntrip.username,
      password:
        inactive || isPastExpiry
          ? "NONE"
          : options.revealPassword
            ? plainPassword
            : maskRtkPassword(plainPassword),
    },
    subscription: {
      plan: user.subscription.plan,
      status: effectiveStatus as SessionUser["subscription"]["status"],
      label: isPastExpiry ? "Trial expirado" : user.subscription.label,
    },
    rtkLicense: user.rtkLicense ?? null,
    rtkLicenseId: user.rtkLicenseId ?? null,
  };
}

export function getDecryptedNtripCredentials(user: UserDto): UserDto["ntrip"] {
  return {
    ...user.ntrip,
    username: user.credentialsActive ? user.ntrip.username : "NONE",
    password: user.credentialsActive ? user.ntrip.password : "NONE",
  };
}

export async function authenticateStoredUser(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const user = await findUserByEmail(email.trim().toLowerCase());
  if (!user) return null;
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;
  return storedUserToSession(user);
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "DG";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** @deprecated JSON store removido — mantido para compatibilidade de imports */
export async function saveStoredUsers(_users: UserDto[]): Promise<void> {
  throw new Error("saveStoredUsers não é suportado com PostgreSQL. Use repositories.");
}

export type { UserDto as StoredUser } from "@/lib/db/dtos";
