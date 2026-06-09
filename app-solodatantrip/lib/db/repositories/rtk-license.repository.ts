import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type {
  AdminDashboardStatsDto,
  AdminLicenseFilters,
  AdminLicenseListDto,
  CreateRtkLicenseInput,
  RtkLicenseDto,
  UpdateRtkLicenseInput,
} from "@/lib/db/dtos";
import {
  dtoLicenseStatusToPrisma,
  dtoModeToPrisma,
  mapRtkLicenseToDto,
  prismaLicenseStatusToDto,
} from "@/lib/db/mappers/prisma.mapper";
import { encryptRtkSecret } from "@/lib/rtk/crypto";
import type { RtkLicenseStatus } from "@/lib/rtk/license-status";

const notDeleted = { deletedAt: null } as const;

export class RTKLicenseRepository {
  async create(input: CreateRtkLicenseInput): Promise<RtkLicenseDto> {
    const license = await prisma.rtkLicense.create({
      data: {
        licenseId: input.licenseId,
        userId: input.userId,
        plan: input.plan,
        status: dtoLicenseStatusToPrisma(input.status),
        mode: dtoModeToPrisma(input.mode),
        expiresAt: input.expiresAt,
        ntripServer: input.credentials.server,
        ntripPort: input.credentials.port,
        ntripMountpoint: input.credentials.mountpoint,
        ntripUsername: input.credentials.username,
        ntripPasswordEnc: encryptPassword(input.credentials.password),
        isPrimary: input.isPrimary ?? false,
        provider: input.provider ?? "rtkdata-reseller",
        idempotencyKey: input.idempotencyKey ?? null,
      },
    });
    return mapRtkLicenseToDto(license);
  }

  async findByLicenseId(licenseId: string): Promise<RtkLicenseDto | null> {
    const license = await prisma.rtkLicense.findFirst({
      where: { licenseId, ...notDeleted },
    });
    return license ? mapRtkLicenseToDto(license) : null;
  }

  async findPrimaryByUserId(userId: string): Promise<RtkLicenseDto | null> {
    const license = await prisma.rtkLicense.findFirst({
      where: { userId, isPrimary: true, ...notDeleted },
      orderBy: { createdAt: "desc" },
    });
    return license ? mapRtkLicenseToDto(license) : null;
  }

  async findAllByUserId(userId: string): Promise<RtkLicenseDto[]> {
    const licenses = await prisma.rtkLicense.findMany({
      where: { userId, ...notDeleted },
      orderBy: { createdAt: "desc" },
    });
    return licenses.map(mapRtkLicenseToDto);
  }

  async setPrimary(userId: string, licenseId: string): Promise<void> {
    await prisma.$transaction([
      prisma.rtkLicense.updateMany({
        where: { userId, ...notDeleted },
        data: { isPrimary: false },
      }),
      prisma.rtkLicense.updateMany({
        where: { userId, licenseId, ...notDeleted },
        data: { isPrimary: true },
      }),
    ]);
  }

  async update(id: string, input: UpdateRtkLicenseInput): Promise<RtkLicenseDto> {
    const data: Prisma.RtkLicenseUpdateInput = {};

    if (input.status !== undefined) {
      data.status = dtoLicenseStatusToPrisma(input.status);
    }
    if (input.expiresAt !== undefined) data.expiresAt = input.expiresAt;
    if (input.isPrimary !== undefined) data.isPrimary = input.isPrimary;
    if (input.credentials) {
      if (input.credentials.server !== undefined) {
        data.ntripServer = input.credentials.server;
      }
      if (input.credentials.port !== undefined) data.ntripPort = input.credentials.port;
      if (input.credentials.mountpoint !== undefined) {
        data.ntripMountpoint = input.credentials.mountpoint;
      }
      if (input.credentials.username !== undefined) {
        data.ntripUsername = input.credentials.username;
      }
      if (input.credentials.password !== undefined) {
        data.ntripPasswordEnc = encryptPassword(input.credentials.password);
      }
    }

    const license = await prisma.rtkLicense.update({ where: { id }, data });
    return mapRtkLicenseToDto(license);
  }

  async updateByLicenseId(
    licenseId: string,
    input: UpdateRtkLicenseInput,
  ): Promise<RtkLicenseDto | null> {
    const existing = await prisma.rtkLicense.findFirst({
      where: { licenseId, ...notDeleted },
    });
    if (!existing) return null;
    return this.update(existing.id, input);
  }

  async markExpiredLicenses(): Promise<RtkLicenseDto[]> {
    const now = new Date();
    const expired = await prisma.rtkLicense.findMany({
      where: {
        ...notDeleted,
        status: { in: ["ACTIVE", "PENDING"] },
        expiresAt: { lt: now },
      },
    });

    if (expired.length === 0) return [];

    await prisma.rtkLicense.updateMany({
      where: { id: { in: expired.map((l) => l.id) } },
      data: { status: "EXPIRED" },
    });

    return expired.map((l) =>
      mapRtkLicenseToDto({ ...l, status: "EXPIRED" }),
    );
  }

  async getAdminDashboardStats(): Promise<AdminDashboardStatsDto> {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeLicenses,
      expiredLicenses,
      suspendedLicenses,
      pendingLicenses,
      activeTrials,
      expiringIn7Days,
      recentAuditEvents,
    ] = await Promise.all([
      prisma.user.count({ where: notDeleted }),
      prisma.rtkLicense.count({ where: { status: "ACTIVE", ...notDeleted } }),
      prisma.rtkLicense.count({ where: { status: "EXPIRED", ...notDeleted } }),
      prisma.rtkLicense.count({ where: { status: "SUSPENDED", ...notDeleted } }),
      prisma.rtkLicense.count({ where: { status: "PENDING", ...notDeleted } }),
      prisma.trialRegistry.count({
        where: { status: "ACTIVE", ...notDeleted },
      }),
      prisma.rtkLicense.count({
        where: {
          status: "ACTIVE",
          expiresAt: { gte: now, lte: in7Days },
          ...notDeleted,
        },
      }),
      prisma.rtkAuditLog.count({ where: { createdAt: { gte: dayAgo } } }),
    ]);

    return {
      totalUsers,
      activeLicenses,
      expiredLicenses,
      suspendedLicenses,
      pendingLicenses,
      activeTrials,
      expiringIn7Days,
      recentAuditEvents,
    };
  }

  async getAdminLicenseList(
    filters: AdminLicenseFilters = {},
  ): Promise<AdminLicenseListDto> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const skip = (page - 1) * limit;
    const now = new Date();

    const where: Prisma.RtkLicenseWhereInput = { ...notDeleted };

    if (filters.status) {
      where.status = dtoLicenseStatusToPrisma(filters.status);
    }
    if (filters.plan) where.plan = filters.plan;
    if (filters.expiringWithinDays !== undefined) {
      const until = new Date(
        now.getTime() + filters.expiringWithinDays * 24 * 60 * 60 * 1000,
      );
      where.status = "ACTIVE";
      where.expiresAt = { gte: now, lte: until };
    }

    const [total, rows] = await Promise.all([
      prisma.rtkLicense.count({ where }),
      prisma.rtkLicense.findMany({
        where,
        include: { user: { select: { email: true, name: true } } },
        orderBy: [{ status: "asc" }, { expiresAt: "asc" }],
        skip,
        take: limit,
      }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        licenseId: row.licenseId,
        userId: row.userId,
        userEmail: row.user.email,
        userName: row.user.name,
        plan: row.plan,
        status: prismaLicenseStatusToDto(row.status),
        mode: row.mode === "PRODUCTION" ? "production" : "test",
        expiresAt: row.expiresAt?.toISOString() ?? null,
        isPrimary: row.isPrimary,
        createdAt: row.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async countByStatus(status: RtkLicenseStatus): Promise<number> {
    return prisma.rtkLicense.count({
      where: { status: dtoLicenseStatusToPrisma(status), ...notDeleted },
    });
  }

  async softDelete(id: string): Promise<void> {
    await prisma.rtkLicense.update({
      where: { id },
      data: { deletedAt: new Date(), isPrimary: false },
    });
  }
}

function encryptPassword(password: string): string {
  return password === "NONE" ? password : encryptRtkSecret(password);
}

export const rtkLicenseRepository = new RTKLicenseRepository();
