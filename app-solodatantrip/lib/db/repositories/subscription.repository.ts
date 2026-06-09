import "server-only";

import type {
  BillingSubscription,
  BillingSubscriptionStatus,
  PaymentProvider,
  Plan,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { BillingSubscriptionDto, PlanDto } from "@/lib/billing/types";

const notDeleted = { deletedAt: null } as const;

function mapPlan(plan: Plan): PlanDto {
  return {
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    price: Number(plan.price),
    durationDays: plan.durationDays,
    maxDevices: plan.maxDevices,
    active: plan.active,
    stripePriceId: plan.stripePriceId,
    mercadoPagoPlanId: plan.mercadoPagoPlanId,
    features: (plan.features as Record<string, unknown> | null) ?? null,
  };
}

function mapSubscription(
  sub: BillingSubscription & { plan?: Plan },
): BillingSubscriptionDto {
  return {
    id: sub.id,
    userId: sub.userId,
    planId: sub.planId,
    status: sub.status,
    provider: sub.provider,
    externalId: sub.externalId,
    currentPeriodStart: sub.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    nextBillingAt: sub.nextBillingAt?.toISOString() ?? null,
    retryCount: sub.retryCount,
    plan: sub.plan ? mapPlan(sub.plan) : undefined,
  };
}

export class SubscriptionRepository {
  async create(input: {
    userId: string;
    planId: string;
    provider: PaymentProvider;
    externalId?: string;
    externalCustomerId?: string;
    status?: BillingSubscriptionStatus;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    nextBillingAt?: Date;
  }): Promise<BillingSubscriptionDto> {
    const sub = await prisma.billingSubscription.create({
      data: {
        userId: input.userId,
        planId: input.planId,
        provider: input.provider,
        externalId: input.externalId,
        externalCustomerId: input.externalCustomerId,
        status: input.status ?? "PENDING",
        currentPeriodStart: input.currentPeriodStart,
        currentPeriodEnd: input.currentPeriodEnd,
        nextBillingAt: input.nextBillingAt,
      },
      include: { plan: true },
    });
    return mapSubscription(sub);
  }

  async findActiveByUserId(userId: string): Promise<BillingSubscriptionDto | null> {
    const sub = await prisma.billingSubscription.findFirst({
      where: {
        userId,
        status: { in: ["ACTIVE", "OVERDUE"] },
        ...notDeleted,
      },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
    return sub ? mapSubscription(sub) : null;
  }

  async findByExternalId(externalId: string): Promise<BillingSubscriptionDto | null> {
    const sub = await prisma.billingSubscription.findFirst({
      where: { externalId, ...notDeleted },
      include: { plan: true },
    });
    return sub ? mapSubscription(sub) : null;
  }

  async updateStatus(
    id: string,
    status: BillingSubscriptionStatus,
    extra?: Prisma.BillingSubscriptionUpdateInput,
  ): Promise<void> {
    await prisma.billingSubscription.update({
      where: { id },
      data: { status, ...extra },
    });
  }

  async findOverdue(): Promise<BillingSubscriptionDto[]> {
    const subs = await prisma.billingSubscription.findMany({
      where: {
        status: { in: ["ACTIVE", "OVERDUE"] },
        nextBillingAt: { lt: new Date() },
        ...notDeleted,
      },
      include: { plan: true },
    });
    return subs.map(mapSubscription);
  }

  async findDueForRenewal(withinDays = 3): Promise<BillingSubscriptionDto[]> {
    const until = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);
    const subs = await prisma.billingSubscription.findMany({
      where: {
        status: "ACTIVE",
        nextBillingAt: { lte: until, gte: new Date() },
        ...notDeleted,
      },
      include: { plan: true },
    });
    return subs.map(mapSubscription);
  }

  async incrementRetry(id: string): Promise<number> {
    const sub = await prisma.billingSubscription.update({
      where: { id },
      data: { retryCount: { increment: 1 } },
    });
    return sub.retryCount;
  }
}

export const subscriptionRepository = new SubscriptionRepository();
