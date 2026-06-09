import "server-only";

import type { Payment, PaymentProvider, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { PaymentDto } from "@/lib/billing/types";

function mapPayment(p: Payment): PaymentDto {
  return {
    id: p.id,
    userId: p.userId,
    subscriptionId: p.subscriptionId,
    provider: p.provider,
    amount: Number(p.amount),
    currency: p.currency,
    status: p.status,
    method: p.method,
    pixQrCode: p.pixQrCode,
    pixQrCodeBase64: p.pixQrCodeBase64,
    pixTicketUrl: p.pixTicketUrl,
    paidAt: p.paidAt?.toISOString() ?? null,
  };
}

export class PaymentRepository {
  async create(input: {
    userId: string;
    subscriptionId?: string;
    provider: PaymentProvider;
    amount: number;
    method?: string;
    externalId?: string;
    pixQrCode?: string;
    pixQrCodeBase64?: string;
    pixTicketUrl?: string;
  }): Promise<PaymentDto> {
    const payment = await prisma.payment.create({
      data: {
        userId: input.userId,
        subscriptionId: input.subscriptionId,
        provider: input.provider,
        amount: input.amount,
        method: input.method,
        externalId: input.externalId,
        pixQrCode: input.pixQrCode,
        pixQrCodeBase64: input.pixQrCodeBase64,
        pixTicketUrl: input.pixTicketUrl,
        status: "PENDING",
      },
    });
    return mapPayment(payment);
  }

  async markPaid(id: string, externalId?: string): Promise<PaymentDto> {
    const payment = await prisma.payment.update({
      where: { id },
      data: { status: "PAID", paidAt: new Date(), externalId },
    });
    return mapPayment(payment);
  }

  async findByExternalId(externalId: string): Promise<PaymentDto | null> {
    const payment = await prisma.payment.findFirst({ where: { externalId } });
    return payment ? mapPayment(payment) : null;
  }

  async findById(id: string): Promise<PaymentDto | null> {
    const payment = await prisma.payment.findUnique({ where: { id } });
    return payment ? mapPayment(payment) : null;
  }

  async updateStatus(id: string, status: PaymentStatus): Promise<void> {
    await prisma.payment.update({ where: { id }, data: { status } });
  }

  async getMonthlyRevenue(year: number, month: number): Promise<number> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const result = await prisma.payment.aggregate({
      where: {
        status: "PAID",
        paidAt: { gte: start, lt: end },
      },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  async getMonthlyPaidCount(year: number, month: number): Promise<number> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    return prisma.payment.count({
      where: { status: "PAID", paidAt: { gte: start, lt: end } },
    });
  }
}

export const paymentRepository = new PaymentRepository();
