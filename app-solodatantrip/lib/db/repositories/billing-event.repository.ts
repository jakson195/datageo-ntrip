import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

export class BillingEventRepository {
  async log(input: {
    provider: "STRIPE" | "MERCADO_PAGO" | "MANUAL";
    eventType: string;
    externalId?: string;
    payload: Record<string, unknown>;
  }): Promise<string> {
    const event = await prisma.billingEvent.create({
      data: {
        provider: input.provider,
        eventType: input.eventType,
        externalId: input.externalId,
        payload: input.payload as Prisma.InputJsonValue,
      },
    });
    return event.id;
  }

  async markProcessed(id: string): Promise<void> {
    await prisma.billingEvent.update({
      where: { id },
      data: { processed: true },
    });
  }
}

export const billingEventRepository = new BillingEventRepository();
