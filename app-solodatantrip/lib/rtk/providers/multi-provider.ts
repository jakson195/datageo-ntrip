import "server-only";

import { RtkDataResellerProvider } from "./rtk-data-reseller-provider";
import type { CreateRtkLicenseResult, RtkLicenseRecord } from "../types";
import type { RtkProvider, RtkProvisionParams, RtkRenewParams } from "./types";

function renewToProvision(params: RtkRenewParams): RtkProvisionParams {
  return {
    customerName: params.customerName,
    customerEmail: params.customerEmail,
    plan: params.plan,
    idempotencyKey: params.idempotencyKey,
  };
}

/** Stub — integração SNIP Caster futura */
export class SnipProvider implements RtkProvider {
  readonly name = "snip";

  async provision(_params: RtkProvisionParams): Promise<CreateRtkLicenseResult> {
    return {
      ok: false,
      error: "Provedor SNIP ainda não configurado.",
      code: "NOT_CONFIGURED",
    };
  }

  async renew(params: RtkRenewParams): Promise<CreateRtkLicenseResult> {
    return this.provision(renewToProvision(params));
  }
}

export class EmlidCasterProvider implements RtkProvider {
  readonly name = "emlid-caster";

  async provision(_params: RtkProvisionParams): Promise<CreateRtkLicenseResult> {
    return { ok: false, error: "Provedor Emlid Caster ainda não configurado.", code: "NOT_CONFIGURED" };
  }

  async renew(params: RtkRenewParams): Promise<CreateRtkLicenseResult> {
    return this.provision(renewToProvision(params));
  }
}

export class BkgCasterProvider implements RtkProvider {
  readonly name = "bkg-caster";

  async provision(_params: RtkProvisionParams): Promise<CreateRtkLicenseResult> {
    return { ok: false, error: "Provedor BKG Caster ainda não configurado.", code: "NOT_CONFIGURED" };
  }

  async renew(params: RtkRenewParams): Promise<CreateRtkLicenseResult> {
    return this.provision(renewToProvision(params));
  }
}

export class CustomCasterProvider implements RtkProvider {
  readonly name = "custom-caster";

  async provision(params: RtkProvisionParams): Promise<CreateRtkLicenseResult> {
    const server = process.env.CUSTOM_CASTER_HOST?.trim();
    if (!server) {
      return { ok: false, error: "CUSTOM_CASTER_HOST não configurado.", code: "NOT_CONFIGURED" };
    }

    const license: RtkLicenseRecord = {
      licenseId: `custom-${Date.now()}`,
      plan: params.plan,
      status: "active",
      mode: "production",
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      credentials: {
        server,
        port: process.env.CUSTOM_CASTER_PORT?.trim() || "2101",
        mountpoint: process.env.CUSTOM_CASTER_MOUNTPOINT?.trim() || "AUTO",
        username: params.customerEmail.split("@")[0],
        password: `custom-${params.idempotencyKey.slice(0, 8)}`,
      },
    };

    return { ok: true, data: license };
  }

  async renew(params: RtkRenewParams): Promise<CreateRtkLicenseResult> {
    return this.provision(renewToProvision(params));
  }
}

export type RtkProviderType =
  | "rtkdata"
  | "snip"
  | "emlid-caster"
  | "bkg-caster"
  | "custom-caster";

export function resolveRtkProvider(type?: string): RtkProvider {
  const raw = (type ?? process.env.RTK_PROVIDER ?? "rtkdata").trim().toLowerCase();
  switch (raw as RtkProviderType) {
    case "snip":
      return new SnipProvider();
    case "emlid-caster":
      return new EmlidCasterProvider();
    case "bkg-caster":
      return new BkgCasterProvider();
    case "custom-caster":
      return new CustomCasterProvider();
    case "rtkdata":
    default:
      return new RtkDataResellerProvider();
  }
}
