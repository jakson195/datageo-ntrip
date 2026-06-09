import "server-only";

import { MercadoPagoConfig, Payment } from "mercadopago";
import { prisma } from "@/lib/db/prisma";
import { planRepository } from "@/lib/db/repositories/plan.repository";
import { paymentRepository } from "@/lib/db/repositories/payment.repository";
import { subscriptionRepository } from "@/lib/db/repositories/subscription.repository";
import { billingEventRepository } from "@/lib/db/repositories/billing-event.repository";
import { invoiceRepository } from "@/lib/db/repositories/invoice.repository";
import { ntripSubscriptionActivationService } from "@/lib/ntrip/subscription-activation.service";
import { InvoiceService } from "@/lib/billing/invoice.service";
import { BillingAutomationService } from "@/lib/billing/billing-automation.service";
import type { PixPaymentResult } from "@/lib/billing/types";

function getClient(): MercadoPagoConfig {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurada.");
  return new MercadoPagoConfig({ accessToken: token });
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3001";
}

export class MercadoPagoService {
  private invoiceService = new InvoiceService();
  private automation = new BillingAutomationService();

  async createPixPayment(
    userId: string,
    email: string,
    planSlug: string,
  ): Promise<PixPaymentResult> {
    const plan = await planRepository.findBySlug(planSlug);
    if (!plan) throw new Error(`Plano "${planSlug}" não encontrado.`);

    const client = getClient();
    const paymentApi = new Payment(client);

    const mpPayment = await paymentApi.create({
      body: {
        transaction_amount: plan.price,
        description: `Datageo RTK — ${plan.name}`,
        payment_method_id: "pix",
        payer: { email },
        notification_url: `${appUrl()}/api/pix/webhook`,
        metadata: { userId, planSlug, planId: plan.id },
      },
    });

    const pixData = mpPayment.point_of_interaction?.transaction_data;
    const localPayment = await paymentRepository.create({
      userId,
      provider: "MERCADO_PAGO",
      amount: plan.price,
      method: "pix",
      externalId: String(mpPayment.id),
      pixQrCode: pixData?.qr_code ?? undefined,
      pixQrCodeBase64: pixData?.qr_code_base64 ?? undefined,
      pixTicketUrl: pixData?.ticket_url ?? undefined,
    });

    const sub = await subscriptionRepository.create({
      userId,
      planId: plan.id,
      provider: "MERCADO_PAGO",
      status: "PENDING",
    });

    await prisma.payment.update({
      where: { id: localPayment.id },
      data: { subscriptionId: sub.id },
    });

    await ntripSubscriptionActivationService.createPendingSubscription(
      userId,
      planSlug,
      "MERCADO_PAGO",
      sub.id,
    );

    return {
      paymentId: localPayment.id,
      qrCode: pixData?.qr_code ?? "",
      qrCodeBase64: pixData?.qr_code_base64 ?? "",
      ticketUrl: pixData?.ticket_url ?? null,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  async handleWebhook(body: Record<string, unknown>): Promise<void> {
    const eventId = await billingEventRepository.log({
      provider: "MERCADO_PAGO",
      eventType: String(body.type ?? body.action ?? "unknown"),
      externalId: String(body.id ?? ""),
      payload: body,
    });

    try {
      const data = body.data as { id?: string } | undefined;
      const paymentId = data?.id ?? (body as { id?: string }).id;
      if (!paymentId) return;

      const client = getClient();
      const paymentApi = new Payment(client);
      const mpPayment = await paymentApi.get({ id: String(paymentId) });

      const localPayment = await paymentRepository.findByExternalId(String(paymentId));
      if (!localPayment) return;

      if (mpPayment.status === "approved") {
        await this.onPaymentApproved(localPayment.id, localPayment.userId, localPayment.subscriptionId);
      } else if (mpPayment.status === "rejected" || mpPayment.status === "cancelled") {
        await paymentRepository.updateStatus(localPayment.id, "FAILED");
        if (localPayment.subscriptionId) {
          await subscriptionRepository.updateStatus(localPayment.subscriptionId, "OVERDUE");
        }
      }

      await billingEventRepository.markProcessed(eventId);
    } catch (error) {
      console.error("[mercadopago-webhook]", error);
      throw error;
    }
  }

  private async onPaymentApproved(
    paymentId: string,
    userId: string,
    subscriptionId: string | null,
  ): Promise<void> {
    await paymentRepository.markPaid(paymentId);

    if (subscriptionId) {
      const sub = await prisma.billingSubscription.findUnique({
        where: { id: subscriptionId },
        include: { plan: true },
      });

      if (sub) {
        const now = new Date();
        const periodEnd = new Date(
          now.getTime() + sub.plan.durationDays * 24 * 60 * 60 * 1000,
        );

        await subscriptionRepository.updateStatus(subscriptionId, "ACTIVE", {
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          nextBillingAt: periodEnd,
          lastPaymentAt: now,
          retryCount: 0,
        });

        const inv = await invoiceRepository.create({
          userId,
          subscriptionId,
          paymentId,
          amount: Number(sub.plan.price),
        });
        await this.invoiceService.issueInvoice(inv.id);
        await this.automation.activateAfterPayment(
          userId,
          sub.plan.slug,
          subscriptionId,
          "MERCADO_PAGO",
        );
      }
    }
  }
}

export const mercadoPagoService = new MercadoPagoService();
