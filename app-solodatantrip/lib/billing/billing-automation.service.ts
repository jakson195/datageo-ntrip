import "server-only";

import type { ActivationSource } from "@prisma/client";
import { subscriptionRepository } from "@/lib/db/repositories/subscription.repository";
import { ntripSubscriptionRepository } from "@/lib/db/repositories/ntrip-subscription.repository";
import {
  ntripSubscriptionActivationService,
  type ActivateSubscriptionResult,
} from "@/lib/ntrip/subscription-activation.service";
import { suspendRtkLicense, cancelRtkLicense } from "@/lib/rtk/expiration-job";
import { billingNotificationService } from "@/lib/billing/notification.service";
import { appendRtkAuditLog } from "@/lib/rtk/audit-log";
import { prisma } from "@/lib/db/prisma";

export class BillingAutomationService {
  async activateAfterPayment(
    userId: string,
    planSlug: string,
    billingSubscriptionId?: string,
    source: ActivationSource = "STRIPE",
    paymentId?: string,
  ): Promise<ActivateSubscriptionResult> {
    const result = await ntripSubscriptionActivationService.activateAfterPayment(
      userId,
      planSlug,
      billingSubscriptionId,
      source,
      paymentId,
    );

    if (!result.ok) {
      console.error(
        JSON.stringify({
          service: "billing-automation",
          event: "activate_after_payment_failed",
          userId,
          planSlug,
          error: result.error,
        }),
      );
      await ntripSubscriptionActivationService.createPendingSubscription(
        userId,
        planSlug,
        source,
        billingSubscriptionId,
      );
      return result;
    }

    console.log(
      JSON.stringify({
        service: "billing-automation",
        event: "activate_after_payment",
        userId,
        planSlug,
        subscriptionId: result.subscriptionId,
        licenseId: result.licenseId,
      }),
    );

    return result;
  }

  async cancelSubscription(userId: string, reason = "Assinatura cancelada"): Promise<void> {
    const subscription = await ntripSubscriptionRepository.findLatestByUserId(userId);
    if (subscription) {
      await ntripSubscriptionRepository.markExpired(subscription.id);
    }
    await cancelRtkLicense(userId, reason);
  }

  async suspendForNonPayment(userId: string, subscriptionId: string): Promise<void> {
    await subscriptionRepository.updateStatus(subscriptionId, "SUSPENDED");

    await prisma.user.update({
      where: { id: userId },
      data: {
        credentialsActive: false,
        streams: 0,
        subscriptionStatus: "INATIVO",
        subscriptionLabel: "Licença suspensa — inadimplência",
      },
    });

    await ntripSubscriptionActivationService.suspendSubscription(
      userId,
      "Inadimplência de pagamento",
    );
    await suspendRtkLicense(userId, "Inadimplência de pagamento");

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await appendRtkAuditLog({
        action: "license.suspend",
        userId,
        userEmail: user.email,
        licenseId: user.activeLicenseId,
        ip: "billing-automation",
        metadata: { reason: "non_payment", subscriptionId },
      });
    }
  }

  async reactivateAfterPayment(
    userId: string,
    subscriptionId: string,
    paymentId?: string,
  ): Promise<ActivateSubscriptionResult> {
    const sub = await prisma.billingSubscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    await subscriptionRepository.updateStatus(subscriptionId, "ACTIVE", {
      retryCount: 0,
      lastPaymentAt: new Date(),
    });

    return this.activateAfterPayment(
      userId,
      sub?.plan.slug ?? "mensal",
      subscriptionId,
      sub?.provider === "MERCADO_PAGO" ? "MERCADO_PAGO" : "STRIPE",
      paymentId,
    );
  }

  async sendDueReminders(): Promise<number> {
    const subs = await subscriptionRepository.findDueForRenewal(7);
    let sent = 0;
    for (const sub of subs) {
      sent += await billingNotificationService.sendExpiryReminders(sub);
    }
    return sent;
  }

  async processOverdueSubscriptions(): Promise<{ suspended: number; retried: number }> {
    const overdue = await subscriptionRepository.findOverdue();
    let suspended = 0;
    let retried = 0;

    for (const sub of overdue) {
      const retries = await subscriptionRepository.incrementRetry(sub.id);
      await subscriptionRepository.updateStatus(sub.id, "OVERDUE");
      retried += 1;

      if (retries >= 3) {
        await this.suspendForNonPayment(sub.userId, sub.id);
        suspended += 1;
      }
    }

    return { suspended, retried };
  }

  async attemptPaymentRecovery(userId: string): Promise<boolean> {
    const sub = await subscriptionRepository.findActiveByUserId(userId);
    if (!sub || sub.status !== "OVERDUE") return false;

    console.log(
      JSON.stringify({
        service: "billing-automation",
        event: "payment_recovery_attempt",
        userId,
        subscriptionId: sub.id,
      }),
    );
    return false;
  }
}

export const billingAutomationService = new BillingAutomationService();
