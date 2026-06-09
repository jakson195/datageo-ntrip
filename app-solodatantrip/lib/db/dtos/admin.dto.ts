import type { RtkLicenseStatus } from "@/lib/rtk/license-status";

export interface AdminDashboardStatsDto {
  totalUsers: number;
  activeLicenses: number;
  expiredLicenses: number;
  suspendedLicenses: number;
  pendingLicenses: number;
  activeTrials: number;
  expiringIn7Days: number;
  recentAuditEvents: number;
}

export interface AdminLicenseRowDto {
  id: string;
  licenseId: string;
  userId: string;
  userEmail: string;
  userName: string;
  plan: string;
  status: RtkLicenseStatus;
  mode: "test" | "production";
  expiresAt: string | null;
  isPrimary: boolean;
  createdAt: string;
}

export interface AdminLicenseListDto {
  items: AdminLicenseRowDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminLicenseFilters {
  status?: RtkLicenseStatus;
  plan?: string;
  expiringWithinDays?: number;
  page?: number;
  limit?: number;
}
