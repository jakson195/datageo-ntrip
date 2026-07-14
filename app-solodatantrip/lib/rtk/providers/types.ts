import "server-only";

import type { CreateRtkLicenseResult, RtkLicenseRecord } from "../types";

export interface RtkProvisionParams {
  customerName: string;
  customerEmail: string;
  plan: string;
  idempotencyKey: string;
  username?: string;
  country?: string;
  maxConnections?: number;
}

export interface RtkRenewParams {
  customerName: string;
  customerEmail: string;
  plan: string;
  previousLicenseId: string | null;
  idempotencyKey: string;
  username?: string;
  country?: string;
  maxConnections?: number;
}

export interface RtkProvider {
  readonly name: string;
  provision(params: RtkProvisionParams): Promise<CreateRtkLicenseResult>;
  renew(params: RtkRenewParams): Promise<CreateRtkLicenseResult>;
}

export type { RtkLicenseRecord, CreateRtkLicenseResult };
