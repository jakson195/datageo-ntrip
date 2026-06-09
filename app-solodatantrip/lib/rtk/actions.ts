"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createSessionToken,
  getSession,
  SESSION_COOKIE,
  type SessionUser,
} from "@/lib/auth";
import { appendRtkAuditLog } from "@/lib/rtk/audit-log";
import { maskRtkPassword } from "@/lib/rtk/crypto";
import { resolveLicenseStatus } from "@/lib/rtk/license-status";
import { checkRateLimit } from "@/lib/rtk/rate-limit";
import { assertTrialNotDuplicated, emailHasTrialLicense } from "@/lib/rtk/trial-registry";
import { rtkProviderService } from "@/lib/rtk/providers/rtk-provider-service";
import type { RtkPublicCredentials } from "@/lib/rtk/types";
import { buildWebhookEvent, rtkWebhookRegistry } from "@/lib/rtk/webhooks";
import { ntripSubscriptionActivationService } from "@/lib/ntrip/subscription-activation.service";
import {
  findStoredUserById,
  getDecryptedNtripCredentials,
  saveRtkLicenseForUser,
  storedUserToSession,
} from "@/lib/users-store";

export interface RtkActionResult {
  success: boolean;
  error?: string;
  code?: string;
  credentials?: RtkPublicCredentials;
  license?: {
    license_id: string;
    plan: string;
    status: string;
    mode: string;
    expires_at: string | null;
  };
  replayed?: boolean;
}

async function refreshSession(user: SessionUser): Promise<void> {
  const token = createSessionToken(user);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

async function requireAuthenticatedUser(): Promise<
  { ok: true; session: SessionUser; stored: NonNullable<Awaited<ReturnType<typeof findStoredUserById>>> } |
  { ok: false; error: string; code: string }
> {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Não autenticado.", code: "UNAUTHENTICATED" };
  }

  const stored = await findStoredUserById(session.id);
  if (!stored) {
    return { ok: false, error: "Usuário não encontrado.", code: "VALIDATION_ERROR" };
  }

  if (stored.email.toLowerCase() !== session.email.toLowerCase()) {
    return { ok: false, error: "Sessão inválida.", code: "UNAUTHENTICATED" };
  }

  return { ok: true, session, stored };
}

export async function createRtkLicenseAction(
  plan?: string,
  clientIp = "unknown",
): Promise<RtkActionResult> {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return { success: false, error: auth.error, code: auth.code };

  const rateKey = `create-license:${auth.session.id}:${clientIp}`;
  const rate = await checkRateLimit(rateKey, 5, 15 * 60 * 1000);
  if (!rate.allowed) {
    return {
      success: false,
      error: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
      code: "RATE_LIMITED",
    };
  }

  const selectedPlan = (plan?.trim() || rtkProviderService.getDefaultPlan()).toLowerCase();

  if (selectedPlan === "trial") {
    const registryBlocked = await emailHasTrialLicense(auth.session.email);
    if (registryBlocked) {
      return {
        success: false,
        error: "Este e-mail já possui uma licença trial RTK registrada.",
        code: "TRIAL_DUPLICATE",
      };
    }

    const trialCheck = assertTrialNotDuplicated(auth.stored, selectedPlan);
    if (!trialCheck.ok) {
      return { success: false, error: trialCheck.error, code: "TRIAL_DUPLICATE" };
    }

    const activation = await ntripSubscriptionActivationService.activateSubscription({
      userId: auth.session.id,
      planSlug: "trial",
      source: "TRIAL",
      ip: clientIp,
    });

    if (!activation.ok) {
      return { success: false, error: activation.error, code: "VALIDATION_ERROR" };
    }

    const saved = await findStoredUserById(auth.session.id);
    if (!saved?.rtkLicense) {
      return { success: false, error: "Licença trial criada, mas não foi possível carregar os dados.", code: "VALIDATION_ERROR" };
    }

    const creds = getDecryptedNtripCredentials(saved);
    const updatedSession = storedUserToSession(saved);
    await refreshSession(updatedSession);
    revalidatePath("/area-cliente/credenciais");

    return {
      success: true,
      credentials: {
        username: creds.username,
        password: creds.password,
        server: creds.server,
        port: creds.port,
        mountpoint: creds.mountpoint,
      },
      license: {
        license_id: saved.rtkLicense.licenseId,
        plan: saved.rtkLicense.plan,
        status: saved.rtkLicense.status,
        mode: saved.rtkLicense.mode,
        expires_at: saved.rtkLicense.expiresAt,
      },
    };
  }

  if (!rtkProviderService.isConfigured()) {
    return {
      success: false,
      error: "Provisionamento RTK não configurado no servidor.",
      code: "NOT_CONFIGURED",
    };
  }

  const trialCheck = assertTrialNotDuplicated(auth.stored, selectedPlan);
  if (!trialCheck.ok) {
    return { success: false, error: trialCheck.error, code: "TRIAL_DUPLICATE" };
  }

  const result = await rtkProviderService.createLicense(
    auth.session.name,
    auth.session.email,
    selectedPlan,
  );

  if (!result.ok) {
    return { success: false, error: result.error, code: result.code };
  }

  const saved = await saveRtkLicenseForUser(auth.session.id, result.data);
  if (!saved.ok) {
    return { success: false, error: saved.error, code: "VALIDATION_ERROR" };
  }

  await appendRtkAuditLog({
    action: "license.create",
    userId: auth.session.id,
    userEmail: auth.session.email,
    licenseId: result.data.licenseId,
    ip: clientIp,
    metadata: {
      plan: result.data.plan,
      mode: result.data.mode,
      replayed: result.replayed ?? false,
      provider: rtkProviderService.getProviderName(),
    },
  });

  await rtkWebhookRegistry.dispatch(
    buildWebhookEvent("license.created", {
      licenseId: result.data.licenseId,
      userEmail: auth.session.email,
      plan: result.data.plan,
      status: result.data.status,
      mode: result.data.mode,
    }),
  );

  const updatedSession = storedUserToSession(saved.user);
  await refreshSession(updatedSession);
  revalidatePath("/area-cliente/credenciais");

  return {
    success: true,
    credentials: {
      username: result.data.credentials.username,
      password: result.data.credentials.password,
      server: result.data.credentials.server,
      port: result.data.credentials.port,
      mountpoint: result.data.credentials.mountpoint,
    },
    license: {
      license_id: result.data.licenseId,
      plan: result.data.plan,
      status: result.data.status,
      mode: result.data.mode,
      expires_at: result.data.expiresAt,
    },
    replayed: result.replayed,
  };
}

export async function renewRtkLicenseAction(
  plan?: string,
  clientIp = "unknown",
): Promise<RtkActionResult> {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return { success: false, error: auth.error, code: auth.code };

  if (!rtkProviderService.isConfigured()) {
    return {
      success: false,
      error: "Provisionamento RTK não configurado no servidor.",
      code: "NOT_CONFIGURED",
    };
  }

  const rateKey = `renew-license:${auth.session.id}:${clientIp}`;
  const rate = await checkRateLimit(rateKey, 3, 15 * 60 * 1000);
  if (!rate.allowed) {
    return {
      success: false,
      error: "Muitas tentativas de renovação. Tente novamente mais tarde.",
      code: "RATE_LIMITED",
    };
  }

  const currentStatus = resolveLicenseStatus({
    status: auth.stored.rtkLicense?.status,
    expiresAt: auth.stored.rtkLicense?.expiresAt ?? auth.stored.expiryDate,
    credentialsActive: auth.stored.credentialsActive,
  });

  if (currentStatus === "active") {
    return {
      success: false,
      error: "Sua licença ainda está ativa. Renovação disponível após expiração.",
      code: "VALIDATION_ERROR",
    };
  }

  const selectedPlan = (plan?.trim() || auth.stored.rtkLicense?.plan || rtkProviderService.getDefaultPlan()).toLowerCase();

  if (selectedPlan === "trial") {
    const trialCheck = assertTrialNotDuplicated(auth.stored, "trial");
    if (!trialCheck.ok) {
      return { success: false, error: trialCheck.error, code: "TRIAL_DUPLICATE" };
    }
  }

  const result = await rtkProviderService.renewLicense(
    auth.session.name,
    auth.session.email,
    auth.stored.rtkLicenseId ?? auth.stored.rtkLicense?.licenseId ?? null,
    selectedPlan,
  );

  if (!result.ok) {
    return { success: false, error: result.error, code: result.code };
  }

  const saved = await saveRtkLicenseForUser(auth.session.id, result.data);
  if (!saved.ok) {
    return { success: false, error: saved.error, code: "VALIDATION_ERROR" };
  }

  await appendRtkAuditLog({
    action: "license.renew",
    userId: auth.session.id,
    userEmail: auth.session.email,
    licenseId: result.data.licenseId,
    ip: clientIp,
    metadata: {
      previousLicenseId: auth.stored.rtkLicenseId,
      plan: result.data.plan,
      provider: rtkProviderService.getProviderName(),
    },
  });

  await rtkWebhookRegistry.dispatch(
    buildWebhookEvent("license.renewed", {
      licenseId: result.data.licenseId,
      userEmail: auth.session.email,
      plan: result.data.plan,
      status: result.data.status,
      previousLicenseId: auth.stored.rtkLicenseId ?? undefined,
    }),
  );

  const updatedSession = storedUserToSession(saved.user);
  await refreshSession(updatedSession);
  revalidatePath("/area-cliente/credenciais");

  return {
    success: true,
    credentials: {
      username: result.data.credentials.username,
      password: result.data.credentials.password,
      server: result.data.credentials.server,
      port: result.data.credentials.port,
      mountpoint: result.data.credentials.mountpoint,
    },
    license: {
      license_id: result.data.licenseId,
      plan: result.data.plan,
      status: result.data.status,
      mode: result.data.mode,
      expires_at: result.data.expiresAt,
    },
    replayed: result.replayed,
  };
}

export async function getRtkCredentialsAction(): Promise<
  { success: true; credentials: RtkPublicCredentials; passwordMasked: string } |
  { success: false; error: string }
> {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return { success: false, error: auth.error };

  const status = resolveLicenseStatus({
    status: auth.stored.rtkLicense?.status,
    expiresAt: auth.stored.rtkLicense?.expiresAt ?? auth.stored.expiryDate,
    credentialsActive: auth.stored.credentialsActive,
  });

  if (status !== "active") {
    return { success: false, error: "Licença RTK não está ativa." };
  }

  const creds = getDecryptedNtripCredentials(auth.stored);

  return {
    success: true,
    credentials: {
      username: creds.username,
      password: creds.password,
      server: creds.server,
      port: creds.port,
      mountpoint: creds.mountpoint,
    },
    passwordMasked: maskRtkPassword(creds.password),
  };
}
