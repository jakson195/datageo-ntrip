import "server-only";

import type { Plan } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { PlanDto } from "@/lib/billing/types";

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

export class PlanRepository {
  async findAllActive(): Promise<PlanDto[]> {
    const plans = await prisma.plan.findMany({
      where: { active: true, ...notDeleted },
      orderBy: { price: "asc" },
    });
    return plans.map(mapPlan);
  }

  async findBySlug(slug: string): Promise<PlanDto | null> {
    const plan = await prisma.plan.findFirst({
      where: { slug, ...notDeleted },
    });
    return plan ? mapPlan(plan) : null;
  }

  async findById(id: string): Promise<PlanDto | null> {
    const plan = await prisma.plan.findFirst({ where: { id, ...notDeleted } });
    return plan ? mapPlan(plan) : null;
  }
}

export const planRepository = new PlanRepository();
