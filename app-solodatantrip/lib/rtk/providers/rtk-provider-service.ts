import "server-only";

import { randomUUID } from "crypto";
import { getRtkConfig, isRtkApiConfigured } from "../config";
import { RtkDataResellerProvider } from "./rtk-data-reseller-provider";
import { resolveRtkProvider } from "./multi-provider";
import type { RtkProvider, RtkProvisionParams, RtkRenewParams } from "./types";
import type { CreateRtkLicenseResult } from "../types";

export class RTKProviderService {
  private readonly provider: RtkProvider;

  constructor(provider?: RtkProvider) {
    this.provider = provider ?? resolveRtkProvider();
  }

  getProviderName(): string {
    return this.provider.name;
  }

  isConfigured(): boolean {
    return isRtkApiConfigured();
  }

  getDefaultPlan(): string {
    return getRtkConfig().defaultPlan;
  }

  async createLicense(
    customerName: string,
    customerEmail: string,
    plan?: string,
    idempotencyKey?: string,
  ): Promise<CreateRtkLicenseResult> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        error: "Provisionamento RTK não configurado no servidor.",
        code: "NOT_CONFIGURED",
      };
    }

    const trimmedName = customerName.trim();
    const trimmedEmail = customerEmail.trim().toLowerCase();
    const selectedPlan = (plan?.trim() || this.getDefaultPlan()).toLowerCase();

    if (!trimmedName || !trimmedEmail) {
      return {
        ok: false,
        error: "Nome e e-mail do cliente são obrigatórios.",
        code: "VALIDATION_ERROR",
      };
    }

    const params: RtkProvisionParams = {
      customerName: trimmedName,
      customerEmail: trimmedEmail,
      plan: selectedPlan,
      idempotencyKey: idempotencyKey?.trim() || randomUUID(),
    };

    return this.provider.provision(params);
  }

  async renewLicense(
    customerName: string,
    customerEmail: string,
    previousLicenseId: string | null,
    plan?: string,
  ): Promise<CreateRtkLicenseResult> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        error: "Provisionamento RTK não configurado no servidor.",
        code: "NOT_CONFIGURED",
      };
    }

    const params: RtkRenewParams = {
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      plan: (plan?.trim() || this.getDefaultPlan()).toLowerCase(),
      previousLicenseId,
      idempotencyKey: randomUUID(),
    };

    return this.provider.renew(params);
  }
}

export const rtkProviderService = new RTKProviderService();

/** @deprecated Use rtkProviderService.createLicense */
export async function createRTKLicense(
  customerName: string,
  customerEmail: string,
  plan?: string,
  idempotencyKey?: string,
): Promise<CreateRtkLicenseResult> {
  return rtkProviderService.createLicense(
    customerName,
    customerEmail,
    plan,
    idempotencyKey,
  );
}

/** Compatibilidade com fluxo de cadastro existente */
export async function provisionRtkAccount(params: {
  email: string;
  name: string;
  idempotencyKey: string;
}): Promise<CreateRtkLicenseResult> {
  return rtkProviderService.createLicense(
    params.name,
    params.email,
    undefined,
    params.idempotencyKey,
  );
}
