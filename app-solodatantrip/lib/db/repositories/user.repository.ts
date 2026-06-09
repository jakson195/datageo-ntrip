import "server-only";

import type { Prisma, User } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { CreateUserInput, UpdateUserInput, UserDto } from "@/lib/db/dtos";
import { mapUserToDto } from "@/lib/db/mappers/prisma.mapper";
import { encryptRtkSecret } from "@/lib/rtk/crypto";
import { dtoSubscriptionToPrisma } from "@/lib/db/mappers/prisma.mapper";

function toPrismaUserSubscriptionStatus(
  status?: UserDto["subscription"]["status"],
): "ativo" | "inativo" {
  if (status === "ativo" || status === "active") return "ativo";
  return "inativo";
}

const notDeleted = { deletedAt: null } as const;

const userInclude = {
  rtkLicenses: {
    where: { isPrimary: true, ...notDeleted },
    take: 1,
  },
  ntripSubscriptions: {
    where: notDeleted,
    orderBy: { createdAt: "desc" as const },
    take: 1,
    include: { plan: true },
  },
} as const;

export class UserRepository {
  async findByEmail(email: string): Promise<UserDto | null> {
    const user = await prisma.user.findFirst({
      where: { email: email.trim().toLowerCase(), ...notDeleted },
      include: userInclude,
    });
    if (!user) return null;
    return mapUserToDto(user, user.rtkLicenses[0] ?? null, user.ntripSubscriptions[0] ?? null);
  }

  async findById(id: string): Promise<UserDto | null> {
    const user = await prisma.user.findFirst({
      where: { id, ...notDeleted },
      include: userInclude,
    });
    if (!user) return null;
    return mapUserToDto(user, user.rtkLicenses[0] ?? null, user.ntripSubscriptions[0] ?? null);
  }

  async findByIdWithPassword(id: string): Promise<User | null> {
    return prisma.user.findFirst({ where: { id, ...notDeleted } });
  }

  async emailExists(email: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: { email: email.trim().toLowerCase(), ...notDeleted },
    });
    return count > 0;
  }

  async create(input: CreateUserInput): Promise<UserDto> {
    const user = await prisma.user.create({
      data: {
        email: input.email.trim().toLowerCase(),
        passwordHash: input.passwordHash,
        name: input.name.trim(),
        role: input.role ?? "USER",
        streams: input.streams ?? 0,
        expiryDate: input.expiryDate ?? null,
        credentialsActive: input.credentialsActive ?? false,
        ntripServer: input.ntrip?.server ?? "sa.geodnet.com",
        ntripPort: input.ntrip?.port ?? "2101",
        ntripMountpoint: input.ntrip?.mountpoint ?? "AUTO",
        ntripUsername: input.ntrip?.username ?? "NONE",
        ntripPasswordEnc: encryptNtripPassword(input.ntrip?.password ?? "NONE"),
        subscriptionPlan: input.subscription?.plan ?? "pendente",
        subscriptionStatus: dtoSubscriptionToPrisma(
          toPrismaUserSubscriptionStatus(input.subscription?.status),
        ),
        subscriptionLabel: input.subscription?.label ?? "Aguardando ativação",
      },
    });
    return mapUserToDto(user, null);
  }

  async update(id: string, input: UpdateUserInput): Promise<UserDto> {
    const data: Prisma.UserUpdateInput = {};

    if (input.streams !== undefined) data.streams = input.streams;
    if (input.expiryDate !== undefined) data.expiryDate = input.expiryDate;
    if (input.credentialsActive !== undefined) {
      data.credentialsActive = input.credentialsActive;
    }
    if (input.activeLicenseId !== undefined) {
      data.activeLicenseId = input.activeLicenseId;
    }
    if (input.ntrip) {
      if (input.ntrip.server !== undefined) data.ntripServer = input.ntrip.server;
      if (input.ntrip.port !== undefined) data.ntripPort = input.ntrip.port;
      if (input.ntrip.mountpoint !== undefined) {
        data.ntripMountpoint = input.ntrip.mountpoint;
      }
      if (input.ntrip.username !== undefined) data.ntripUsername = input.ntrip.username;
      if (input.ntrip.password !== undefined) {
        data.ntripPasswordEnc = encryptNtripPassword(input.ntrip.password);
      }
    }
    if (input.subscription) {
      if (input.subscription.plan !== undefined) {
        data.subscriptionPlan = input.subscription.plan;
      }
      if (input.subscription.status !== undefined) {
        data.subscriptionStatus = dtoSubscriptionToPrisma(
          toPrismaUserSubscriptionStatus(input.subscription.status),
        );
      }
      if (input.subscription.label !== undefined) {
        data.subscriptionLabel = input.subscription.label;
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      include: {
        rtkLicenses: {
          where: { isPrimary: true, ...notDeleted },
          take: 1,
        },
      },
    });

    return mapUserToDto(user, user.rtkLicenses[0] ?? null);
  }

  async softDelete(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findAllActive(): Promise<UserDto[]> {
    const users = await prisma.user.findMany({
      where: notDeleted,
      include: {
        rtkLicenses: {
          where: { isPrimary: true, ...notDeleted },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return users.map((user) => mapUserToDto(user, user.rtkLicenses[0] ?? null));
  }

  async countActive(): Promise<number> {
    return prisma.user.count({ where: notDeleted });
  }
}

function encryptNtripPassword(password: string): string {
  return password === "NONE" ? password : encryptRtkSecret(password);
}

export const userRepository = new UserRepository();
