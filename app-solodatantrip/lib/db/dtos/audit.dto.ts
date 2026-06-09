export type AuditActionDto =
  | "license.create"
  | "license.renew"
  | "license.expire"
  | "license.suspend"
  | "license.webhook";

export interface AuditLogDto {
  id: string;
  action: AuditActionDto;
  userId: string;
  userEmail: string;
  licenseId: string | null;
  ip: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface CreateAuditLogInput {
  action: AuditActionDto;
  userId: string;
  userEmail: string;
  licenseId?: string | null;
  ip: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogPaginationInput {
  page?: number;
  limit?: number;
  userId?: string;
  licenseId?: string;
  action?: AuditActionDto;
}

export interface PaginatedAuditLogsDto {
  items: AuditLogDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
