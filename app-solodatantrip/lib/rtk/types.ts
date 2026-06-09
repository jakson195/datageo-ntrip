export type RtkApiMode = "test" | "production";

export type { RtkLicenseStatus } from "./license-status";

export interface RtkCredentials {
  username: string;
  password: string;
  server: string;
  port: string;
  mountpoint: string;
}

/** Licença persistida no banco / exposta na sessão */
export interface RtkLicenseRecord {
  licenseId: string;
  plan: string;
  status: import("./license-status").RtkLicenseStatus | "active";
  mode: RtkApiMode;
  expiresAt: string | null;
  credentials: RtkCredentials;
}

export type RtkErrorCode =
  | "NOT_CONFIGURED"
  | "NETWORK_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "EXTERNAL_ERROR"
  | "VALIDATION_ERROR"
  | "INVALID_RESPONSE"
  | "TRIAL_DUPLICATE"
  | "RATE_LIMITED"
  | "UNAUTHENTICATED";

export type CreateRtkLicenseResult =
  | { ok: true; data: RtkLicenseRecord; replayed?: boolean }
  | { ok: false; error: string; code: RtkErrorCode; httpStatus?: number };

/** Resposta bruta da RTK Data Reseller API */
export interface RtkProvisionApiResponse {
  ok?: boolean;
  error?: string;
  message?: string;
  license_id?: string;
  plan?: string;
  status?: string;
  expires_at?: number;
  mode?: string;
  replayed?: boolean;
  credentials?: {
    username?: string;
    password?: string;
    server?: string;
    port?: number | string;
    mountpoint?: string;
  };
}

export interface RtkPublicCredentials {
  username: string;
  password: string;
  server: string;
  port: string;
  mountpoint: string;
}
