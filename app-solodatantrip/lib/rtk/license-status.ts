import "server-only";

export type RtkLicenseStatus = "pending" | "active" | "expired" | "suspended";

export interface RtkLicenseStatusInput {
  status?: string | null;
  expiresAt?: string | null;
  credentialsActive?: boolean;
}

export function resolveLicenseStatus(input: RtkLicenseStatusInput): RtkLicenseStatus {
  const raw = input.status?.toLowerCase();

  if (raw === "suspended") return "suspended";
  if (raw === "expired") return "expired";

  if (input.expiresAt) {
    const expiry = new Date(input.expiresAt);
    if (!Number.isNaN(expiry.getTime()) && expiry.getTime() < Date.now()) {
      return "expired";
    }
  }

  if (raw === "active" || input.credentialsActive) return "active";
  if (raw === "pending") return "pending";

  return "pending";
}

export function isLicenseUsable(status: RtkLicenseStatus): boolean {
  return status === "active";
}

export const STATUS_LABELS: Record<RtkLicenseStatus, string> = {
  pending: "Pendente",
  active: "Ativa",
  expired: "Expirada",
  suspended: "Suspensa",
};

export const STATUS_BADGE_CLASSES: Record<RtkLicenseStatus, string> = {
  pending: "bg-amber-100 text-amber-800 ring-amber-200",
  active: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  expired: "bg-red-100 text-red-800 ring-red-200",
  suspended: "bg-slate-200 text-slate-800 ring-slate-300",
};
