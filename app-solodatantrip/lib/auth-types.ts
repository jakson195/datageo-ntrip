export interface NtripCredentials {
  server: string;
  port: string;
  mountpoint: string;
  username: string;
  password: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  initials: string;
  role: "USER" | "ADMIN" | "RESELLER" | "SUPER_ADMIN";
  ntrip: NtripCredentials;
  subscription: {
    plan: string;
    status: "pending" | "active" | "suspended" | "expired";
    label: string;
  };
  streams: number;
  expiryDate: string | null;
  credentialsActive: boolean;
  rtkLicenseId?: string | null;
  rtkLicense?: {
    licenseId: string;
    plan: string;
    status: string;
    mode: "test" | "production";
    expiresAt: string | null;
  } | null;
}
