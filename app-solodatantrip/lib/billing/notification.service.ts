import "server-only";

import { prisma } from "@/lib/db/prisma";
import { billingEventRepository } from "@/lib/db/repositories/billing-event.repository";
import type { BillingSubscriptionDto } from "@/lib/billing/types";

export type BillingNotificationType =
  | "billing.expiry_7d"
  | "billing.expiry_3d"
  | "billing.expiry_due"
  | "billing.renewal_success"
  | "billing.payment_failed";

type NotificationTemplate = {
  subject: string;
  body: string;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function template(type: BillingNotificationType, sub: BillingSubscriptionDto, userName: string): NotificationTemplate {
  const plan = sub.plan?.name ?? "RTK";
  const due = formatDate(sub.nextBillingAt);

  switch (type) {
    case "billing.expiry_7d":
      return {
        subject: `DataGeo NTRIP — vencimento em 7 dias (${plan})`,
        body: `Olá ${userName},\n\nSua assinatura ${plan} vence em ${due}. Renove em /area-cliente/assinatura para manter o fix RTK ativo.\n\nEquipe DataGeo NTRIP`,
      };
    case "billing.expiry_3d":
      return {
        subject: `DataGeo NTRIP — vencimento em 3 dias (${plan})`,
        body: `Olá ${userName},\n\nFaltam 3 dias para o vencimento (${due}). Evite suspensão da licença renovando agora.\n\nEquipe DataGeo NTRIP`,
      };
    case "billing.expiry_due":
      return {
        subject: `DataGeo NTRIP — assinatura vence hoje (${plan})`,
        body: `Olá ${userName},\n\nSua assinatura vence hoje (${due}). Renove para continuar com correções RTK.\n\nEquipe DataGeo NTRIP`,
      };
    case "billing.renewal_success":
      return {
        subject: `DataGeo NTRIP — renovação confirmada (${plan})`,
        body: `Olá ${userName},\n\nPagamento recebido. Sua licença ${plan} foi renovada até ${due}.\n\nEquipe DataGeo NTRIP`,
      };
    case "billing.payment_failed":
      return {
        subject: `DataGeo NTRIP — pagamento recusado (${plan})`,
        body: `Olá ${userName},\n\nNão foi possível processar o pagamento da assinatura ${plan}. Atualize em /area-cliente/assinatura.\n\nEquipe DataGeo NTRIP`,
      };
    default:
      return { subject: "DataGeo NTRIP", body: "" };
  }
}

async function deliverEmail(to: string, subject: string, body: string): Promise<boolean> {
  const webhook = process.env.BILLING_NOTIFICATION_WEBHOOK_URL?.trim();
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body }),
      });
      return true;
    } catch (error) {
      console.error("[notification-webhook]", error);
    }
  }

  console.log(
    JSON.stringify({
      service: "billing-notification",
      channel: "email",
      to,
      subject,
      preview: body.slice(0, 120),
    }),
  );
  return true;
}

export class BillingNotificationService {
  async send(
    userId: string,
    email: string,
    userName: string,
    sub: BillingSubscriptionDto,
    type: BillingNotificationType,
  ): Promise<boolean> {
    const referenceId = `${sub.id}:${sub.nextBillingAt ?? "none"}:${type}`;
    const already = await billingEventRepository.wasNotificationSent(userId, type, referenceId);
    if (already) return false;

    const { subject, body } = template(type, sub, userName);
    const sent = await deliverEmail(email, subject, body);
    if (!sent) return false;

    await billingEventRepository.logNotification({
      userId,
      notificationType: type,
      referenceId,
      payload: { email, subject, subscriptionId: sub.id },
    });
    return true;
  }

  async sendExpiryReminders(sub: BillingSubscriptionDto): Promise<number> {
    if (!sub.nextBillingAt || sub.status !== "ACTIVE") return 0;

    const user = await prisma.user.findUnique({ where: { id: sub.userId } });
    if (!user) return 0;

    const daysLeft = Math.ceil(
      (new Date(sub.nextBillingAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
    );

    let type: BillingNotificationType | null = null;
    if (daysLeft === 7) type = "billing.expiry_7d";
    else if (daysLeft === 3) type = "billing.expiry_3d";
    else if (daysLeft === 0) type = "billing.expiry_due";

    if (!type) return 0;
    const sent = await this.send(user.id, user.email, user.name, sub, type);
    return sent ? 1 : 0;
  }

  async notifyRenewalSuccess(userId: string, subscriptionId: string): Promise<void> {
    const sub = await prisma.billingSubscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!sub || !user) return;

    const dto: BillingSubscriptionDto = {
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
      plan: {
        id: sub.plan.id,
        slug: sub.plan.slug,
        name: sub.plan.name,
        price: Number(sub.plan.price),
        durationDays: sub.plan.durationDays,
        maxDevices: sub.plan.maxDevices,
        active: sub.plan.active,
        stripePriceId: sub.plan.stripePriceId,
        mercadoPagoPlanId: sub.plan.mercadoPagoPlanId,
        features: (sub.plan.features as Record<string, unknown> | null) ?? null,
      },
    };

    await this.send(userId, user.email, user.name, dto, "billing.renewal_success");
  }

  async notifyPaymentFailed(userId: string, subscriptionId: string): Promise<void> {
    const sub = await prisma.billingSubscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!sub || !user) return;

    const dto: BillingSubscriptionDto = {
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
      plan: {
        id: sub.plan.id,
        slug: sub.plan.slug,
        name: sub.plan.name,
        price: Number(sub.plan.price),
        durationDays: sub.plan.durationDays,
        maxDevices: sub.plan.maxDevices,
        active: sub.plan.active,
        stripePriceId: sub.plan.stripePriceId,
        mercadoPagoPlanId: sub.plan.mercadoPagoPlanId,
        features: (sub.plan.features as Record<string, unknown> | null) ?? null,
      },
    };

    await this.send(userId, user.email, user.name, dto, "billing.payment_failed");
  }
}

export const billingNotificationService = new BillingNotificationService();
