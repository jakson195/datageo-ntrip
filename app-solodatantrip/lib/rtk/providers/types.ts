import "server-only";

import type { CreateRtkLicenseResult, RtkLicenseRecord } from "../types";

export interface RtkProvisionParams {
  customerName: string;
  customerEmail: string;
  plan: string;
  idempotencyKey: string;
}

export interface RtkRenewParams {
  customerName: string;
  customerEmail: string;
  plan: string;
  previousLicenseId: string | null;
  idempotencyKey: string;
}

export interface RtkProvider {
  readonly name: string;
  provision(params: RtkProvisionParams): Promise<CreateRtkLicenseResult>;
  renew(params: RtkRenewParams): Promise<CreateRtkLicenseResult>;
}

export type { RtkLicenseRecord, CreateRtkLicenseResult };
