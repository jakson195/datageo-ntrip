import "server-only";

import type {
  BillingSubscriptionStatus,
  InvoiceStatus,
  PaymentProvider,
  PaymentStatus,
  UserRole,
} from "@prisma/client";

export type { BillingSubscriptionStatus, InvoiceStatus, PaymentProvider, PaymentStatus, UserRole };

export interface PlanDto {
  id: string;
  slug: string;
  name: string;
  price: number;
  durationDays: number;
  maxDevices: number;
  active: boolean;
  stripePriceId: string | null;
  mercadoPagoPlanId: string | null;
  features: Record<string, unknown> | null;
}

export interface BillingSubscriptionDto {
  id: string;
  userId: string;
  planId: string;
  status: BillingSubscriptionStatus;
  provider: PaymentProvider;
  externalId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  nextBillingAt: string | null;
  retryCount: number;
  plan?: PlanDto;
}

export interface PaymentDto {
  id: string;
  userId: string;
  subscriptionId: string | null;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: string | null;
  pixQrCode: string | null;
  pixQrCodeBase64: string | null;
  pixTicketUrl: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface InvoiceDto {
  id: string;
  userId: string;
  amount: number;
  status: InvoiceStatus;
  fiscalProvider: string | null;
  nfNumber: string | null;
  issuedAt: string | null;
}

export interface FinanceDashboardDto {
  mrr: number;
  arr: number;
  annualRevenue: number;
  activeCustomers: number;
  trialCustomers: number;
  churnRate: number;
  monthlyRevenue: number;
  overdueAmount: number;
  activeLicenses: number;
  trialConversionRate: number;
  newCustomersThisMonth: number;
  renewalsThisMonth: number;
  monthlyGrowth: Array<{ month: string; revenue: number; customers: number }>;
  revenueByPlan: Array<{ plan: string; revenue: number; count: number }>;
}

export interface CheckoutResult {
  url: string;
  sessionId: string;
}

export interface PixPaymentResult {
  paymentId: string;
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl: string | null;
  expiresAt: string;
}

export interface MpCheckoutResult {
  url: string;
  preferenceId: string;
  paymentId: string;
  subscriptionId: string;
}

export interface MpRecurringResult {
  url: string;
  preapprovalId: string;
  subscriptionId: string;
}

export interface GnssCredentials {
  host: string;
  port: string;
  username: string;
  password: string;
  mountpoint: string;
}

export interface MpDirectCardPaymentResult {
  status: "approved" | "pending" | "in_process";
  paymentId: string;
  subscriptionId: string;
  mpPaymentId: string;
  statusDetail: string | null;
  credentials?: GnssCredentials;
}

import type {
  ClientPaymentHistoryItem,
  ClientSubscriptionOverview,
} from "@/lib/billing/client-types";

export interface NtripTestResult {
  success: boolean;
  latencyMs: number | null;
  packetLoss: number | null;
  rtcmDetected: boolean;
  mountpointOk: boolean;
  error?: string;
}
