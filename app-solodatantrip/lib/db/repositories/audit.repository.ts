import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type {
  AuditLogDto,
  AuditLogPaginationInput,
  CreateAuditLogInput,
  PaginatedAuditLogsDto,
} from "@/lib/db/dtos";
import {
  dtoAuditActionToPrisma,
  mapAuditLogToDto,
} from "@/lib/db/mappers/prisma.mapper";

export class AuditRepository {
  async append(input: CreateAuditLogInput): Promise<AuditLogDto> {
    const log = await prisma.rtkAuditLog.create({
      data: {
        action: dtoAuditActionToPrisma(input.action),
        userId: input.userId,
        userEmail: input.userEmail,
        licenseId: input.licenseId ?? null,
        ip: input.ip,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    const dto = mapAuditLogToDto(log);

    console.log(
      JSON.stringify({
        service: "rtk-audit",
        level: "info",
        event: dto.action,
        userId: dto.userId,
        userEmail: dto.userEmail,
        licenseId: dto.licenseId,
        ip: dto.ip,
        metadata: dto.metadata,
        timestamp: dto.createdAt,
      }),
    );

    return dto;
  }

  async findPaginated(input: AuditLogPaginationInput = {}): Promise<PaginatedAuditLogsDto> {
    const page = Math.max(1, input.page ?? 1);
    const limit = Math.min(100, Math.max(1, input.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.RtkAuditLogWhereInput = {};
    if (input.userId) where.userId = input.userId;
    if (input.licenseId) where.licenseId = input.licenseId;
    if (input.action) where.action = dtoAuditActionToPrisma(input.action);

    const [total, rows] = await Promise.all([
      prisma.rtkAuditLog.count({ where }),
      prisma.rtkAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return {
      items: rows.map(mapAuditLogToDto),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async countRecent(hours = 24): Promise<number> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return prisma.rtkAuditLog.count({ where: { createdAt: { gte: since } } });
  }
}

export const auditRepository = new AuditRepository();
