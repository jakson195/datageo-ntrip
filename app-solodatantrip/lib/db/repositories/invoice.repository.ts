import "server-only";

import type { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { InvoiceDto } from "@/lib/billing/types";

function mapInvoice(inv: {
  id: string;
  userId: string;
  amount: unknown;
  status: InvoiceStatus;
  fiscalProvider: string | null;
  nfNumber: string | null;
  issuedAt: Date | null;
}): InvoiceDto {
  return {
    id: inv.id,
    userId: inv.userId,
    amount: Number(inv.amount),
    status: inv.status,
    fiscalProvider: inv.fiscalProvider,
    nfNumber: inv.nfNumber,
    issuedAt: inv.issuedAt?.toISOString() ?? null,
  };
}

export class InvoiceRepository {
  async create(input: {
    userId: string;
    subscriptionId?: string;
    paymentId?: string;
    amount: number;
    fiscalProvider?: string;
  }): Promise<InvoiceDto> {
    const invoice = await prisma.invoice.create({
      data: {
        userId: input.userId,
        subscriptionId: input.subscriptionId,
        paymentId: input.paymentId,
        amount: input.amount,
        fiscalProvider: input.fiscalProvider,
        status: "DRAFT",
      },
    });
    return mapInvoice(invoice);
  }

  async updateStatus(
    id: string,
    status: InvoiceStatus,
    extra?: { nfNumber?: string; nfKey?: string; externalId?: string; issuedAt?: Date },
  ): Promise<void> {
    await prisma.invoice.update({ where: { id }, data: { status, ...extra } });
  }

  async findByUserId(userId: string): Promise<InvoiceDto[]> {
    const invoices = await prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return invoices.map(mapInvoice);
  }
}

export const invoiceRepository = new InvoiceRepository();
