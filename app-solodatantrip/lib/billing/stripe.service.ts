import "server-only";

import Stripe from "stripe";
import { prisma } from "@/lib/db/prisma";
import { planRepository } from "@/lib/db/repositories/plan.repository";
import { subscriptionRepository } from "@/lib/db/repositories/subscription.repository";
import { paymentRepository } from "@/lib/db/repositories/payment.repository";
import { billingEventRepository } from "@/lib/db/repositories/billing-event.repository";
import { invoiceRepository } from "@/lib/db/repositories/invoice.repository";
import { InvoiceService } from "@/lib/billing/invoice.service";
import { BillingAutomationService } from "@/lib/billing/billing-automation.service";
import type { CheckoutResult } from "@/lib/billing/types";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada.");
  return new Stripe(key, { apiVersion: "2026-05-27.dahlia" });
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3001";
}

export class StripeService {
  private invoiceService = new InvoiceService();
  private automation = new BillingAutomationService();

  async getOrCreateCustomer(userId: string, email: string, name: string): Promise<string> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.stripeCustomerId) return user.stripeCustomerId;

    const customer = await getStripe().customers.create({ email, name, metadata: { userId } });
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });
    return customer.id;
  }

  async createCheckoutSession(
    userId: string,
    email: string,
    name: string,
    planSlug: string,
  ): Promise<CheckoutResult> {
    const plan = await planRepository.findBySlug(planSlug);
    if (!plan?.stripePriceId) {
      throw new Error(`Plano "${planSlug}" sem stripePriceId configurado.`);
    }

    const customerId = await this.getOrCreateCustomer(userId, email, name);
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${appUrl()}/area-cliente/assinatura?success=1`,
      cancel_url: `${appUrl()}/area-cliente/planos?cancelled=1`,
      metadata: { userId, planSlug, planId: plan.id },
      subscription_data: {
        metadata: { userId, planId: plan.id },
      },
    });

    if (!session.url) throw new Error("Stripe não retornou URL de checkout.");

    return { url: session.url, sessionId: session.id };
  }

  async createCustomerPortal(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeCustomerId) {
      throw new Error("Cliente Stripe não encontrado.");
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl()}/area-cliente/assinatura`,
    });

    return session.url;
  }

  async handleWebhook(rawBody: string, signature: string): Promise<void> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET não configurada.");

    const event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
    const eventId = await billingEventRepository.log({
      provider: "STRIPE",
      eventType: event.type,
      externalId: event.id,
      payload: event.data.object as unknown as Record<string, unknown>,
    });

    try {
      switch (event.type) {
        case "checkout.session.completed":
          await this.onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case "invoice.paid":
          await this.onInvoicePaid(event.data.object as Stripe.Invoice);
          break;
        case "invoice.payment_failed":
          await this.onPaymentFailed(event.data.object as Stripe.Invoice);
          break;
        case "customer.subscription.deleted":
          await this.onSubscriptionCancelled(event.data.object as Stripe.Subscription);
          break;
        default:
          break;
      }
      await billingEventRepository.markProcessed(eventId);
    } catch (error) {
      console.error("[stripe-webhook]", error);
      throw error;
    }
  }

  private async onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;
    if (!userId || !planId) return;

    const plan = await planRepository.findById(planId);
    if (!plan) return;

    const now = new Date();
    const periodEnd = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    const billingSub = await subscriptionRepository.create({
      userId,
      planId,
      provider: "STRIPE",
      externalId: session.subscription as string,
      externalCustomerId: session.customer as string,
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      nextBillingAt: periodEnd,
    });

    await this.automation.activateAfterPayment(userId, plan.slug, billingSub.id, "STRIPE");
  }

  private async onInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const subId =
      (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null })
        .subscription ?? null;
    const subIdStr = typeof subId === "string" ? subId : subId?.id ?? null;
    if (!subIdStr) return;

    const sub = await subscriptionRepository.findByExternalId(subIdStr);
    if (!sub) return;

    const payment = await paymentRepository.create({
      userId: sub.userId,
      subscriptionId: sub.id,
      provider: "STRIPE",
      amount: (invoice.amount_paid ?? 0) / 100,
      method: "card",
      externalId: invoice.id,
    });
    await paymentRepository.markPaid(payment.id, invoice.id);

    const inv = await invoiceRepository.create({
      userId: sub.userId,
      subscriptionId: sub.id,
      paymentId: payment.id,
      amount: payment.amount,
    });
    await this.invoiceService.issueInvoice(inv.id);

    await subscriptionRepository.updateStatus(sub.id, "ACTIVE", {
      lastPaymentAt: new Date(),
      retryCount: 0,
    });
    await this.automation.activateAfterPayment(
      sub.userId,
      sub.plan?.slug ?? "mensal",
      sub.id,
      "STRIPE",
    );
  }

  private async onPaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subId =
      (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null })
        .subscription ?? null;
    const subIdStr = typeof subId === "string" ? subId : subId?.id ?? null;
    if (!subIdStr) return;

    const sub = await subscriptionRepository.findByExternalId(subIdStr);
    if (!sub) return;

    const retries = await subscriptionRepository.incrementRetry(sub.id);
    await subscriptionRepository.updateStatus(sub.id, "OVERDUE");

    if (retries >= 3) {
      await this.automation.suspendForNonPayment(sub.userId, sub.id);
    }
  }

  private async onSubscriptionCancelled(subscription: Stripe.Subscription): Promise<void> {
    const sub = await subscriptionRepository.findByExternalId(subscription.id);
    if (!sub) return;

    await subscriptionRepository.updateStatus(sub.id, "CANCELLED", {
      cancelledAt: new Date(),
    });
    await this.automation.suspendForNonPayment(sub.userId, sub.id);
  }
}

export const stripeService = new StripeService();
