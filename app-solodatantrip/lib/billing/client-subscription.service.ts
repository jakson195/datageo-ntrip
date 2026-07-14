import "server-only";

import { prisma } from "@/lib/db/prisma";
import { paymentRepository } from "@/lib/db/repositories/payment.repository";
import { planRepository } from "@/lib/db/repositories/plan.repository";
import { subscriptionRepository } from "@/lib/db/repositories/subscription.repository";
import { billingAutomationService } from "@/lib/billing/billing-automation.service";
import { mercadoPagoService } from "@/lib/billing/mercadopago.service";
import { stripeService } from "@/lib/billing/stripe.service";
import type {
  ClientPaymentHistoryItem,
  ClientSubscriptionOverview,
} from "@/lib/billing/client-types";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  PENDING: "Pendente",
  OVERDUE: "Inadimplente",
  SUSPENDED: "Suspenso",
  CANCELLED: "Cancelado",
  TRIAL: "Trial",
  NONE: "Sem assinatura paga",
};

export const PURCHASABLE_PLAN_SLUGS = ["mensal", "trimestral", "anual"] as const;

function needsTrialActivation(user: {
  subscriptionPlan: string;
  credentialsActive: boolean;
  ntripUsername: string;
}): boolean {
  return (
    user.subscriptionPlan === "trial" &&
    (!user.credentialsActive || user.ntripUsername === "NONE")
  );
}

export class ClientSubscriptionService {
  async getOverview(userId: string): Promise<ClientSubscriptionOverview> {
    const [user, billingSub] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      subscriptionRepository.findLatestByUserId(userId),
    ]);

    if (!user) {
      throw new Error("Usuário não encontrado.");
    }

    const trialActivation = needsTrialActivation(user);
    const isTrialAccount = user.subscriptionPlan === "trial";

    if (!billingSub) {
      return {
        planSlug: user.subscriptionPlan || "trial",
        planName: isTrialAccount ? "Trial 30 dias" : user.subscriptionLabel,
        price: 0,
        status: isTrialAccount ? "TRIAL" : "NONE",
        statusLabel: isTrialAccount ? STATUS_LABELS.TRIAL : STATUS_LABELS.NONE,
        provider: null,
        currentPeriodEnd: user.expiryDate?.toISOString() ?? null,
        nextBillingAt: user.expiryDate?.toISOString() ?? null,
        billingSubscriptionId: null,
        canRenew: true,
        canChangePlan: true,
        canPay: false,
        canCancel: false,
        stripePortalAvailable: Boolean(user.stripeCustomerId),
        needsTrialActivation: trialActivation,
      };
    }

    // Conta trial com checkout pago iniciado mas não concluído
    if (isTrialAccount && billingSub.status === "PENDING" && billingSub.plan?.slug !== "trial") {
      return {
        planSlug: billingSub.plan?.slug ?? "mensal",
        planName: billingSub.plan?.name ?? "Plano pendente",
        price: billingSub.plan?.price ?? 0,
        status: "PENDING",
        statusLabel: "Pagamento pendente",
        provider: billingSub.provider,
        currentPeriodEnd: user.expiryDate?.toISOString() ?? null,
        nextBillingAt: billingSub.nextBillingAt,
        billingSubscriptionId: billingSub.id,
        canRenew: true,
        canChangePlan: true,
        canPay: true,
        canCancel: true,
        stripePortalAvailable: Boolean(user.stripeCustomerId),
        needsTrialActivation: trialActivation,
      };
    }

    if (isTrialAccount && (!billingSub.plan || billingSub.plan.slug === "trial")) {
      return {
        planSlug: user.subscriptionPlan || "trial",
        planName: "Trial 30 dias",
        price: 0,
        status: "TRIAL",
        statusLabel: STATUS_LABELS.TRIAL,
        provider: billingSub.provider,
        currentPeriodEnd: user.expiryDate?.toISOString() ?? null,
        nextBillingAt: user.expiryDate?.toISOString() ?? null,
        billingSubscriptionId: billingSub.id,
        canRenew: true,
        canChangePlan: true,
        canPay: false,
        canCancel: billingSub.status !== "CANCELLED",
        stripePortalAvailable: Boolean(user.stripeCustomerId),
        needsTrialActivation: trialActivation,
      };
    }

    return {
      planSlug: billingSub.plan?.slug ?? user.subscriptionPlan,
      planName: billingSub.plan?.name ?? user.subscriptionLabel,
      price: billingSub.plan?.price ?? 0,
      status: billingSub.status,
      statusLabel: STATUS_LABELS[billingSub.status] ?? billingSub.status,
      provider: billingSub.provider,
      currentPeriodEnd: billingSub.currentPeriodEnd,
      nextBillingAt: billingSub.nextBillingAt,
      billingSubscriptionId: billingSub.id,
      canRenew: ["OVERDUE", "SUSPENDED", "CANCELLED"].includes(billingSub.status),
      canChangePlan: ["ACTIVE", "PENDING", "OVERDUE", "SUSPENDED"].includes(billingSub.status),
      canPay: billingSub.status === "PENDING",
      canCancel: ["ACTIVE", "OVERDUE", "PENDING"].includes(billingSub.status),
      stripePortalAvailable: Boolean(user.stripeCustomerId),
      needsTrialActivation: false,
    };
  }

  async getPaymentHistory(userId: string): Promise<ClientPaymentHistoryItem[]> {
    const payments = await paymentRepository.findByUserId(userId, 30);
    const subs = await subscriptionRepository.findAllByUserId(userId);
    const planBySub = new Map(subs.map((s) => [s.id, s.plan?.name ?? null]));

    return payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      method: p.method,
      provider: p.provider,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
      planName: p.subscriptionId ? planBySub.get(p.subscriptionId) ?? null : null,
    }));
  }

  async cancelSubscription(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const latest = await subscriptionRepository.findLatestByUserId(userId);

    if (!latest || latest.status === "CANCELLED") {
      return { ok: false, error: "Nenhuma assinatura ativa para cancelar." };
    }

    if (!["ACTIVE", "OVERDUE", "PENDING"].includes(latest.status)) {
      return { ok: false, error: "Esta assinatura não pode ser cancelada no momento." };
    }

    if (latest.provider === "STRIPE" && latest.externalId) {
      try {
        await stripeService.cancelSubscriptionByExternalId(latest.externalId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao cancelar no Stripe.";
        return { ok: false, error: message };
      }
    }

    if (latest.provider === "MERCADO_PAGO" && latest.externalId) {
      try {
        await mercadoPagoService.cancelRecurring(latest.externalId);
      } catch {
        // Preapproval pode já estar cancelada — segue cancelamento local
      }
    }

    await subscriptionRepository.cancelById(latest.id);

    if (latest.status === "PENDING") {
      return { ok: true };
    }

    await billingAutomationService.cancelSubscription(userId, "Cancelado pelo cliente");
    return { ok: true };
  }

  async listPurchasablePlans() {
    const plans = await Promise.all(
      PURCHASABLE_PLAN_SLUGS.map((slug) => planRepository.findBySlug(slug)),
    );
    return plans.filter(Boolean);
  }
}

export const clientSubscriptionService = new ClientSubscriptionService();
