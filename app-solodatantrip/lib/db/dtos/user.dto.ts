import type { RtkLicenseStatus } from "@/lib/rtk/license-status";

export interface UserNtripDto {
  server: string;
  port: string;
  mountpoint: string;
  username: string;
  password: string;
}

export interface UserSubscriptionDto {
  plan: string;
  status: "pending" | "active" | "suspended" | "expired" | "ativo" | "inativo";
  label: string;
}

export interface UserRtkLicenseSummaryDto {
  licenseId: string;
  plan: string;
  status: RtkLicenseStatus;
  mode: "test" | "production";
  expiresAt: string | null;
}

/** DTO de usuário com licença primária — compatível com o antigo StoredUser */
export interface UserDto {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: "USER" | "ADMIN" | "RESELLER" | "SUPER_ADMIN";
  createdAt: string;
  streams: number;
  expiryDate: string | null;
  credentialsActive: boolean;
  ntrip: UserNtripDto;
  subscription: UserSubscriptionDto;
  rtkLicenseId?: string | null;
  rtkLicense?: UserRtkLicenseSummaryDto | null;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  name: string;
  role?: "USER" | "ADMIN" | "RESELLER" | "SUPER_ADMIN";
  streams?: number;
  expiryDate?: Date | null;
  credentialsActive?: boolean;
  ntrip?: Partial<UserNtripDto>;
  subscription?: Partial<UserSubscriptionDto>;
}

export interface UpdateUserInput {
  streams?: number;
  expiryDate?: Date | null;
  credentialsActive?: boolean;
  ntrip?: Partial<UserNtripDto>;
  subscription?: Partial<UserSubscriptionDto>;
  activeLicenseId?: string | null;
}
