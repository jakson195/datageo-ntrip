import type {
  ActivationSource,
  NtripAccountStatus,
  NtripSubscriptionStatus,
  Plan,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isTrialPlan, trialSubscriptionLabel } from "@/lib/ntrip/trial-config";

const notDeleted = { deletedAt: null } as const;

export type NtripSubscriptionWithPlan = Prisma.NtripSubscriptionGetPayload<{
  include: { plan: true; ntripAccounts: true };
}>;

export class NtripSubscriptionRepository {
  async findLatestByUserId(userId: string): Promise<NtripSubscriptionWithPlan | null> {
    return prisma.ntripSubscription.findFirst({
      where: { userId, ...notDeleted },
      orderBy: { createdAt: "desc" },
      include: {
        plan: true,
        ntripAccounts: { where: { ...notDeleted, isPrimary: true }, take: 1 },
      },
    });
  }

  async findById(id: string): Promise<NtripSubscriptionWithPlan | null> {
    return prisma.ntripSubscription.findFirst({
      where: { id, ...notDeleted },
      include: {
        plan: true,
        ntripAccounts: { where: { ...notDeleted, isPrimary: true }, take: 1 },
      },
    });
  }

  async findPending(limit = 50): Promise<NtripSubscriptionWithPlan[]> {
    return prisma.ntripSubscription.findMany({
      where: { status: "PENDING", ...notDeleted },
      orderBy: { createdAt: "asc" },
      take: limit,
      include: {
        plan: true,
        ntripAccounts: { where: { ...notDeleted, isPrimary: true }, take: 1 },
      },
    });
  }

  async createPending(input: {
    userId: string;
    planId: string;
    source: ActivationSource;
    billingSubscriptionId?: string;
  }) {
    return prisma.ntripSubscription.create({
      data: {
        userId: input.userId,
        planId: input.planId,
        source: input.source,
        billingSubscriptionId: input.billingSubscriptionId,
        status: "PENDING",
      },
      include: { plan: true, ntripAccounts: true },
    });
  }

  async markActive(
    id: string,
    data: { startsAt: Date; expiresAt: Date; activatedAt: Date },
  ) {
    return prisma.ntripSubscription.update({
      where: { id },
      data: {
        status: "ACTIVE",
        startsAt: data.startsAt,
        expiresAt: data.expiresAt,
        activatedAt: data.activatedAt,
        suspendedAt: null,
      },
    });
  }

  async markSuspended(id: string, suspendedAt = new Date()) {
    return prisma.ntripSubscription.update({
      where: { id },
      data: { status: "SUSPENDED", suspendedAt },
    });
  }

  async markExpired(id: string) {
    return prisma.ntripSubscription.update({
      where: { id },
      data: { status: "EXPIRED" },
    });
  }

  async findExpiredActive(): Promise<Array<{ id: string; userId: string }>> {
    const now = new Date();
    return prisma.ntripSubscription.findMany({
      where: {
        status: "ACTIVE",
        expiresAt: { lt: now },
        ...notDeleted,
      },
      select: { id: true, userId: true },
    });
  }
}

export class NtripAccountRepository {
  async create(input: {
    userId: string;
    subscriptionId: string;
    rtkLicenseId?: string;
    host: string;
    port: string;
    mountpoint: string;
    username: string;
    passwordEnc: string;
    status: NtripAccountStatus;
    expiresAt: Date | null;
    isPrimary?: boolean;
  }) {
    return prisma.ntripAccount.create({
      data: {
        ...input,
        isPrimary: input.isPrimary ?? true,
        provisionedAt: new Date(),
      },
    });
  }

  async deactivatePrimaryForUser(userId: string) {
    await prisma.ntripAccount.updateMany({
      where: { userId, isPrimary: true, ...notDeleted },
      data: { isPrimary: false, status: "SUSPENDED" },
    });
  }

  async markExpiredForSubscription(subscriptionId: string) {
    await prisma.ntripAccount.updateMany({
      where: { subscriptionId, ...notDeleted },
      data: { status: "EXPIRED" },
    });
  }

  async markSuspendedForSubscription(subscriptionId: string) {
    await prisma.ntripAccount.updateMany({
      where: { subscriptionId, ...notDeleted },
      data: { status: "SUSPENDED" },
    });
  }

  async findPrimaryByUserId(userId: string) {
    return prisma.ntripAccount.findFirst({
      where: { userId, isPrimary: true, ...notDeleted },
    });
  }
}

export const ntripSubscriptionRepository = new NtripSubscriptionRepository();
export const ntripAccountRepository = new NtripAccountRepository();

export function subscriptionStatusLabel(
  status: NtripSubscriptionStatus,
  plan?: Pick<Plan, "slug" | "name">,
): string {
  switch (status) {
    case "ACTIVE":
      if (plan && isTrialPlan(plan.slug)) return trialSubscriptionLabel();
      return plan ? `Plano ${plan.name} · ativo` : "Assinatura ativa";
    case "PENDING":
      return "Aguardando ativação";
    case "SUSPENDED":
      return "Assinatura suspensa";
    case "EXPIRED":
      return "Assinatura expirada";
    default:
      return "Aguardando ativação";
  }
}

export function mapPrismaSubscriptionStatusToDto(
  status: NtripSubscriptionStatus,
): "pending" | "active" | "suspended" | "expired" {
  const map: Record<NtripSubscriptionStatus, "pending" | "active" | "suspended" | "expired"> = {
    PENDING: "pending",
    ACTIVE: "active",
    SUSPENDED: "suspended",
    EXPIRED: "expired",
  };
  return map[status];
}
