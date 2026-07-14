import "server-only";

import { MercadoPagoConfig, Payment, Preference, PreApproval } from "mercadopago";
import { prisma } from "@/lib/db/prisma";
import { planRepository } from "@/lib/db/repositories/plan.repository";
import { paymentRepository } from "@/lib/db/repositories/payment.repository";
import { subscriptionRepository } from "@/lib/db/repositories/subscription.repository";
import { billingEventRepository } from "@/lib/db/repositories/billing-event.repository";
import { invoiceRepository } from "@/lib/db/repositories/invoice.repository";
import { ntripSubscriptionActivationService } from "@/lib/ntrip/subscription-activation.service";
import { InvoiceService } from "@/lib/billing/invoice.service";
import { BillingAutomationService } from "@/lib/billing/billing-automation.service";
import { billingNotificationService } from "@/lib/billing/notification.service";
import type { ActivateSubscriptionResult } from "@/lib/ntrip/subscription-activation.service";
import type { MpCheckoutResult, MpDirectCardPaymentResult, MpRecurringResult, PixPaymentResult } from "@/lib/billing/types";
import type { PlanDto } from "@/lib/billing/types";

function getClient(): MercadoPagoConfig {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurada.");
  return new MercadoPagoConfig({ accessToken: token });
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
}

export function mercadoPagoWebhookUrl(): string {
  return `${appUrl()}/api/webhooks/mercadopago`;
}

/** MP exige HTTPS na notification_url — omitir em dev local (http://localhost). */
function mpNotificationUrl(): string | undefined {
  const url = mercadoPagoWebhookUrl();
  return url.startsWith("https://") ? url : undefined;
}

function recurringFrequency(plan: PlanDto): { frequency: number; frequency_type: "months"; transaction_amount: number } {
  if (plan.slug === "trimestral") {
    return { frequency: 3, frequency_type: "months", transaction_amount: plan.price };
  }
  if (plan.slug === "anual") {
    return { frequency: 12, frequency_type: "months", transaction_amount: plan.price };
  }
  return { frequency: 1, frequency_type: "months", transaction_amount: plan.price };
}

export class MercadoPagoService {
  private invoiceService = new InvoiceService();
  private automation = new BillingAutomationService();

  private async createPendingBilling(userId: string, plan: PlanDto, planSlug: string) {
    const latest = await subscriptionRepository.findLatestByUserId(userId);
    if (
      latest?.status === "PENDING" &&
      latest.planId === plan.id &&
      latest.provider === "MERCADO_PAGO"
    ) {
      return latest;
    }

    const sub = await subscriptionRepository.create({
      userId,
      planId: plan.id,
      provider: "MERCADO_PAGO",
      status: "PENDING",
    });

    await ntripSubscriptionActivationService.createPendingSubscription(
      userId,
      planSlug,
      "MERCADO_PAGO",
      sub.id,
    );

    return sub;
  }

  async createDirectCardPayment(
    userId: string,
    email: string,
    planSlug: string,
    card: {
      token: string;
      paymentMethodId: string;
      issuerId: string;
      installments: number;
      transactionAmount: number;
      payer: {
        email?: string;
        identification?: { type?: string; number?: string };
      };
    },
  ): Promise<MpDirectCardPaymentResult> {
    const plan = await planRepository.findBySlug(planSlug);
    if (!plan) throw new Error(`Plano "${planSlug}" não encontrado.`);

    const sub = await this.createPendingBilling(userId, plan, planSlug);
    const client = getClient();
    const paymentApi = new Payment(client);

    const mpPayment = await paymentApi.create({
      body: {
        transaction_amount: card.transactionAmount || plan.price,
        token: card.token,
        description: `DataGeo NTRIP — ${plan.name}`,
        installments: card.installments,
        payment_method_id: card.paymentMethodId,
        issuer_id: Number(card.issuerId),
        payer: {
          email: card.payer.email ?? email,
          ...(card.payer.identification?.type && card.payer.identification?.number
            ? {
                identification: {
                  type: card.payer.identification.type,
                  number: card.payer.identification.number,
                },
              }
            : {}),
        },
        ...(mpNotificationUrl() ? { notification_url: mpNotificationUrl() } : {}),
        metadata: { userId, planSlug, planId: plan.id, subscriptionId: sub.id },
        external_reference: sub.id,
      },
    });

    const localPayment = await paymentRepository.create({
      userId,
      subscriptionId: sub.id,
      provider: "MERCADO_PAGO",
      amount: plan.price,
      method: card.paymentMethodId,
      externalId: String(mpPayment.id),
    });

    const status = mpPayment.status ?? "rejected";
    const statusDetail = mpPayment.status_detail ?? null;

    if (status === "approved") {
      const activation = await this.onPaymentApproved(localPayment.id, userId, sub.id);
      return {
        status: "approved",
        paymentId: localPayment.id,
        subscriptionId: sub.id,
        mpPaymentId: String(mpPayment.id),
        statusDetail,
        credentials: activation?.ok
          ? {
              host: activation.credentials.server,
              port: activation.credentials.port,
              username: activation.credentials.username,
              password: activation.credentials.password,
              mountpoint: activation.credentials.mountpoint,
            }
          : undefined,
      };
    }

    if (status === "pending" || status === "in_process") {
      return {
        status: status === "in_process" ? "in_process" : "pending",
        paymentId: localPayment.id,
        subscriptionId: sub.id,
        mpPaymentId: String(mpPayment.id),
        statusDetail,
      };
    }

    await paymentRepository.updateStatus(localPayment.id, "FAILED");
    throw new Error(this.cardRejectionMessage(statusDetail));
  }

  private cardRejectionMessage(statusDetail: string | null): string {
    const messages: Record<string, string> = {
      cc_rejected_bad_filled_card_number: "Número do cartão inválido.",
      cc_rejected_bad_filled_date: "Data de validade inválida.",
      cc_rejected_bad_filled_other: "Revise os dados do cartão.",
      cc_rejected_bad_filled_security_code: "Código de segurança inválido.",
      cc_rejected_blacklist: "Cartão não autorizado.",
      cc_rejected_call_for_authorize: "Ligue para o banco emissor para autorizar.",
      cc_rejected_card_disabled: "Cartão desativado. Use outro cartão.",
      cc_rejected_duplicated_payment: "Pagamento duplicado.",
      cc_rejected_high_risk: "Pagamento recusado por segurança.",
      cc_rejected_insufficient_amount: "Saldo ou limite insuficiente.",
      cc_rejected_invalid_installments: "Parcelamento inválido para este cartão.",
      cc_rejected_max_attempts: "Limite de tentativas excedido.",
      cc_rejected_other_reason: "Pagamento recusado pelo emissor.",
    };
    return messages[statusDetail ?? ""] ?? "Pagamento recusado. Tente outro cartão ou use PIX.";
  }

  async createPixPayment(userId: string, email: string, planSlug: string): Promise<PixPaymentResult> {
    const plan = await planRepository.findBySlug(planSlug);
    if (!plan) throw new Error(`Plano "${planSlug}" não encontrado.`);

    const client = getClient();
    const paymentApi = new Payment(client);

    const mpPayment = await paymentApi.create({
      body: {
        transaction_amount: plan.price,
        description: `DataGeo NTRIP — ${plan.name}`,
        payment_method_id: "pix",
        payer: { email },
        ...(mpNotificationUrl() ? { notification_url: mpNotificationUrl() } : {}),
        metadata: { userId, planSlug, planId: plan.id },
      },
    });

    const pixData = mpPayment.point_of_interaction?.transaction_data;
    const sub = await this.createPendingBilling(userId, plan, planSlug);

    const localPayment = await paymentRepository.create({
      userId,
      subscriptionId: sub.id,
      provider: "MERCADO_PAGO",
      amount: plan.price,
      method: "pix",
      externalId: String(mpPayment.id),
      pixQrCode: pixData?.qr_code ?? undefined,
      pixQrCodeBase64: pixData?.qr_code_base64 ?? undefined,
      pixTicketUrl: pixData?.ticket_url ?? undefined,
    });

    return {
      paymentId: localPayment.id,
      qrCode: pixData?.qr_code ?? "",
      qrCodeBase64: pixData?.qr_code_base64 ?? "",
      ticketUrl: pixData?.ticket_url ?? null,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  async createCardCheckout(
    userId: string,
    email: string,
    planSlug: string,
  ): Promise<MpCheckoutResult> {
    const plan = await planRepository.findBySlug(planSlug);
    if (!plan) throw new Error(`Plano "${planSlug}" não encontrado.`);

    const sub = await this.createPendingBilling(userId, plan, planSlug);
    const client = getClient();
    const preferenceApi = new Preference(client);

    const preference = await preferenceApi.create({
      body: {
        items: [
          {
            id: plan.slug,
            title: `DataGeo NTRIP — ${plan.name}`,
            quantity: 1,
            unit_price: plan.price,
            currency_id: "BRL",
          },
        ],
        payer: { email },
        metadata: { userId, planSlug, planId: plan.id, subscriptionId: sub.id },
        ...(mpNotificationUrl() ? { notification_url: mpNotificationUrl() } : {}),
        back_urls: {
          success: `${appUrl()}/area-cliente/assinatura?success=1`,
          failure: `${appUrl()}/area-cliente/assinatura?failed=1`,
          pending: `${appUrl()}/area-cliente/assinatura?pending=1`,
        },
        auto_return: "approved",
        external_reference: sub.id,
      },
    });

    const localPayment = await paymentRepository.create({
      userId,
      subscriptionId: sub.id,
      provider: "MERCADO_PAGO",
      amount: plan.price,
      method: "card",
      externalId: preference.id,
    });

    if (!preference.init_point) {
      throw new Error("Mercado Pago não retornou URL de checkout.");
    }

    return {
      url: preference.init_point,
      preferenceId: preference.id ?? "",
      paymentId: localPayment.id,
      subscriptionId: sub.id,
    };
  }

  async createRecurringSubscription(
    userId: string,
    email: string,
    planSlug: string,
  ): Promise<MpRecurringResult> {
    const plan = await planRepository.findBySlug(planSlug);
    if (!plan) throw new Error(`Plano "${planSlug}" não encontrado.`);

    const sub = await this.createPendingBilling(userId, plan, planSlug);
    const client = getClient();
    const preApi = new PreApproval(client);
    const recurring = recurringFrequency(plan);

    const preapproval = await preApi.create({
      body: {
        reason: `DataGeo NTRIP — ${plan.name}`,
        payer_email: email,
        back_url: `${appUrl()}/area-cliente/assinatura?recurring=1`,
        external_reference: sub.id,
        auto_recurring: {
          ...recurring,
          currency_id: "BRL",
        },
      },
    });

    if (!preapproval.id) throw new Error("Falha ao criar assinatura recorrente.");

    await subscriptionRepository.updateStatus(sub.id, "PENDING", {
      externalId: preapproval.id,
    });

    if (!preapproval.init_point) {
      throw new Error("Mercado Pago não retornou URL de autorização.");
    }

    return {
      url: preapproval.init_point,
      preapprovalId: preapproval.id,
      subscriptionId: sub.id,
    };
  }

  async cancelRecurring(preapprovalId: string): Promise<void> {
    const client = getClient();
    const preApi = new PreApproval(client);
    await preApi.update({
      id: preapprovalId,
      body: { status: "cancelled" },
    });
  }

  async handleWebhook(body: Record<string, unknown>): Promise<void> {
    const eventType = String(body.type ?? body.action ?? body.topic ?? "unknown");
    const eventId = await billingEventRepository.log({
      provider: "MERCADO_PAGO",
      eventType,
      externalId: String(body.id ?? ""),
      payload: body,
    });

    try {
      if (eventType === "subscription_preapproval" || eventType.includes("preapproval")) {
        await this.handlePreapprovalWebhook(body);
      } else if (
        eventType === "subscription_authorized_payment" ||
        eventType.includes("authorized_payment")
      ) {
        await this.handleAuthorizedPaymentWebhook(body);
      } else {
        await this.handlePaymentWebhook(body);
      }
      await billingEventRepository.markProcessed(eventId);
    } catch (error) {
      console.error("[mercadopago-webhook]", error);
      throw error;
    }
  }

  private async handlePaymentWebhook(body: Record<string, unknown>): Promise<void> {
    const data = body.data as { id?: string } | undefined;
    const paymentId = data?.id ?? (body as { id?: string }).id;
    if (!paymentId) return;

    const client = getClient();
    const paymentApi = new Payment(client);
    const mpPayment = await paymentApi.get({ id: String(paymentId) });

    let localPayment = await paymentRepository.findByExternalId(String(paymentId));

    if (!localPayment && mpPayment.metadata) {
      const meta = mpPayment.metadata as { userId?: string; planSlug?: string; planId?: string };
      const subId = mpPayment.external_reference ?? undefined;
      if (meta.userId && meta.planId) {
        localPayment = await paymentRepository.create({
          userId: meta.userId,
          subscriptionId: typeof subId === "string" ? subId : undefined,
          provider: "MERCADO_PAGO",
          amount: mpPayment.transaction_amount ?? 0,
          method: mpPayment.payment_method_id ?? "card",
          externalId: String(paymentId),
        });
      }
    }

    if (!localPayment) return;

    if (mpPayment.status === "approved") {
      await this.onPaymentApproved(localPayment.id, localPayment.userId, localPayment.subscriptionId);
    } else if (mpPayment.status === "rejected" || mpPayment.status === "cancelled") {
      await paymentRepository.updateStatus(localPayment.id, "FAILED");
      if (localPayment.subscriptionId) {
        await subscriptionRepository.updateStatus(localPayment.subscriptionId, "OVERDUE");
        await billingNotificationService.notifyPaymentFailed(
          localPayment.userId,
          localPayment.subscriptionId,
        );
      }
    }
  }

  private async handlePreapprovalWebhook(body: Record<string, unknown>): Promise<void> {
    const data = body.data as { id?: string } | undefined;
    const preapprovalId = data?.id;
    if (!preapprovalId) return;

    const client = getClient();
    const preApi = new PreApproval(client);
    const pre = await preApi.get({ id: String(preapprovalId) });
    const sub = await subscriptionRepository.findByExternalId(String(preapprovalId));

    if (!sub) return;

    if (pre.status === "authorized") {
      const plan = await planRepository.findById(sub.planId);
      if (!plan) return;
      const now = new Date();
      const periodEnd = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
      await subscriptionRepository.updateStatus(sub.id, "ACTIVE", {
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        nextBillingAt: periodEnd,
        lastPaymentAt: now,
        retryCount: 0,
      });
      await this.automation.activateAfterPayment(sub.userId, plan.slug, sub.id, "MERCADO_PAGO");
    }

    if (pre.status === "cancelled" || pre.status === "paused") {
      await subscriptionRepository.cancelById(sub.id);
      await this.automation.cancelSubscription(sub.userId, "Assinatura recorrente cancelada");
    }
  }

  private async handleAuthorizedPaymentWebhook(body: Record<string, unknown>): Promise<void> {
    const data = body.data as { id?: string } | undefined;
    if (!data?.id) return;

    const client = getClient();
    const paymentApi = new Payment(client);
    const mpPayment = await paymentApi.get({ id: String(data.id) });
    if (mpPayment.status !== "approved") return;

    const preapprovalId =
      (mpPayment as { preapproval_id?: string }).preapproval_id ??
      (mpPayment.metadata as { preapproval_id?: string } | undefined)?.preapproval_id;

    const sub = preapprovalId
      ? await subscriptionRepository.findByExternalId(String(preapprovalId))
      : null;

    if (!sub) return;

    const plan = await planRepository.findById(sub.planId);
    if (!plan) return;

    const payment = await paymentRepository.create({
      userId: sub.userId,
      subscriptionId: sub.id,
      provider: "MERCADO_PAGO",
      amount: mpPayment.transaction_amount ?? plan.price,
      method: "recurring",
      externalId: String(mpPayment.id),
    });

    await this.onPaymentApproved(payment.id, sub.userId, sub.id);
  }

  private async onPaymentApproved(
    paymentId: string,
    userId: string,
    subscriptionId: string | null,
  ): Promise<ActivateSubscriptionResult | null> {
    await paymentRepository.markPaid(paymentId);

    if (!subscriptionId) return null;

    const sub = await prisma.billingSubscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!sub) return null;

    const wasSuspended = sub.status === "SUSPENDED" || sub.status === "OVERDUE";
    const now = new Date();
    const periodEnd = new Date(now.getTime() + sub.plan.durationDays * 24 * 60 * 60 * 1000);

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

    let activation: ActivateSubscriptionResult;
    if (wasSuspended) {
      activation = await this.automation.reactivateAfterPayment(userId, subscriptionId, paymentId);
    } else {
      activation = await this.automation.activateAfterPayment(
        userId,
        sub.plan.slug,
        subscriptionId,
        "MERCADO_PAGO",
        paymentId,
      );
    }

    await billingNotificationService.notifyRenewalSuccess(userId, subscriptionId);
    return activation;
  }
}

export const mercadoPagoService = new MercadoPagoService();
