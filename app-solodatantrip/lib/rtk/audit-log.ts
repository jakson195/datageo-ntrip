import "server-only";

import { auditRepository } from "@/lib/db/repositories/audit.repository";
import type {
  AuditLogPaginationInput,
  CreateAuditLogInput,
  PaginatedAuditLogsDto,
} from "@/lib/db/dtos";

export type RtkAuditAction = CreateAuditLogInput["action"];

export interface RtkAuditEntry {
  id: string;
  action: RtkAuditAction;
  userId: string;
  userEmail: string;
  licenseId: string | null;
  ip: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export async function appendRtkAuditLog(
  entry: Omit<RtkAuditEntry, "id" | "timestamp">,
): Promise<void> {
  await auditRepository.append({
    action: entry.action,
    userId: entry.userId,
    userEmail: entry.userEmail,
    licenseId: entry.licenseId,
    ip: entry.ip,
    metadata: entry.metadata,
  });
}

export async function getRtkAuditLogsPaginated(
  input: AuditLogPaginationInput = {},
): Promise<PaginatedAuditLogsDto> {
  return auditRepository.findPaginated(input);
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}
