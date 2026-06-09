import type { RtkLicenseStatus } from "@/lib/rtk/license-status";

export interface RtkLicenseDto {
  id: string;
  licenseId: string;
  userId: string;
  plan: string;
  status: RtkLicenseStatus;
  mode: "test" | "production";
  expiresAt: string | null;
  credentials: {
    server: string;
    port: string;
    mountpoint: string;
    username: string;
    password: string;
  };
  isPrimary: boolean;
  provider: string;
  idempotencyKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRtkLicenseInput {
  licenseId: string;
  userId: string;
  plan: string;
  status: RtkLicenseStatus;
  mode: "test" | "production";
  expiresAt: Date | null;
  credentials: {
    server: string;
    port: string;
    mountpoint: string;
    username: string;
    password: string;
  };
  isPrimary?: boolean;
  provider?: string;
  idempotencyKey?: string | null;
}

export interface UpdateRtkLicenseInput {
  status?: RtkLicenseStatus;
  expiresAt?: Date | null;
  isPrimary?: boolean;
  credentials?: Partial<RtkLicenseDto["credentials"]>;
}
