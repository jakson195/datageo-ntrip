import "server-only";

import { prisma } from "@/lib/db/prisma";
import { paymentRepository } from "@/lib/db/repositories/payment.repository";
import { rtkLicenseRepository } from "@/lib/db/repositories/rtk-license.repository";
import type { FinanceDashboardDto } from "@/lib/billing/types";

export class FinanceDashboardService {
  async getDashboard(): Promise<FinanceDashboardDto> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const [
      activeCustomers,
      activeLicenses,
      monthlyRevenue,
      overdueSubs,
      trialTotal,
      newCustomersThisMonth,
      renewalsThisMonth,
    ] = await Promise.all([
      prisma.billingSubscription.count({ where: { status: "ACTIVE", deletedAt: null } }),
      rtkLicenseRepository.countByStatus("active"),
      paymentRepository.getMonthlyRevenue(year, month),
      prisma.billingSubscription.findMany({
        where: { status: "OVERDUE", deletedAt: null },
        include: { plan: true },
      }),
      prisma.trialRegistry.count({ where: { deletedAt: null } }),
      prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: { gte: new Date(year, month - 1, 1) },
        },
      }),
      prisma.billingSubscription.count({
        where: {
          status: "ACTIVE",
          lastPaymentAt: { gte: new Date(year, month - 1, 1) },
          deletedAt: null,
        },
      }),
    ]);

    const convertedFromTrial = await prisma.billingSubscription.count({
      where: {
        deletedAt: null,
        plan: { slug: { not: "trial" } },
        user: { trialEntries: { some: { status: "ACTIVE" } } },
      },
    });

    const mrr = await this.calculateMrr();
    const overdueAmount = overdueSubs.reduce((sum, s) => sum + Number(s.plan.price), 0);
    const trialConversionRate =
      trialTotal > 0 ? Math.round((convertedFromTrial / trialTotal) * 100) : 0;

    const cancelledLastMonth = await prisma.billingSubscription.count({
      where: {
        status: "CANCELLED",
        cancelledAt: {
          gte: new Date(year, month - 2, 1),
          lt: new Date(year, month - 1, 1),
        },
      },
    });
    const churnRate =
      activeCustomers > 0
        ? Math.round((cancelledLastMonth / activeCustomers) * 1000) / 10
        : 0;

    const monthlyGrowth = await this.getMonthlyGrowth(6);
    const revenueByPlan = await this.getRevenueByPlan();

    return {
      mrr,
      arr: mrr * 12,
      activeCustomers,
      churnRate,
      monthlyRevenue,
      overdueAmount,
      activeLicenses,
      trialConversionRate,
      newCustomersThisMonth,
      renewalsThisMonth,
      monthlyGrowth,
      revenueByPlan,
    };
  }

  private async calculateMrr(): Promise<number> {
    const activeSubs = await prisma.billingSubscription.findMany({
      where: { status: "ACTIVE", deletedAt: null },
      include: { plan: true },
    });

    return activeSubs.reduce((sum, sub) => {
      const price = Number(sub.plan.price);
      const daily = price / sub.plan.durationDays;
      return sum + daily * 30;
    }, 0);
  }

  private async getMonthlyGrowth(months: number): Promise<FinanceDashboardDto["monthlyGrowth"]> {
    const result: FinanceDashboardDto["monthlyGrowth"] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const revenue = await paymentRepository.getMonthlyRevenue(
        d.getFullYear(),
        d.getMonth() + 1,
      );
      const customers = await prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: { lt: new Date(d.getFullYear(), d.getMonth() + 1, 1) },
        },
      });
      result.push({
        month: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        revenue,
        customers,
      });
    }

    return result;
  }

  private async getRevenueByPlan(): Promise<FinanceDashboardDto["revenueByPlan"]> {
    const plans = await prisma.plan.findMany({ where: { deletedAt: null } });
    const result: FinanceDashboardDto["revenueByPlan"] = [];

    for (const plan of plans) {
      const agg = await prisma.payment.aggregate({
        where: {
          status: "PAID",
          subscription: { planId: plan.id },
        },
        _sum: { amount: true },
        _count: true,
      });
      result.push({
        plan: plan.name,
        revenue: Number(agg._sum.amount ?? 0),
        count: agg._count,
      });
    }

    return result;
  }
}

export const financeDashboardService = new FinanceDashboardService();
