export type ClientSubscriptionStatus =
  | "ACTIVE"
  | "PENDING"
  | "OVERDUE"
  | "SUSPENDED"
  | "CANCELLED"
  | "TRIAL"
  | "NONE";

export interface ClientSubscriptionOverview {
  planSlug: string;
  planName: string;
  price: number;
  status: ClientSubscriptionStatus;
  statusLabel: string;
  provider: "STRIPE" | "MERCADO_PAGO" | "MANUAL" | null;
  currentPeriodEnd: string | null;
  nextBillingAt: string | null;
  billingSubscriptionId: string | null;
  canRenew: boolean;
  canChangePlan: boolean;
  /** Pagamento pendente — exibir PIX/cartão na página de assinatura */
  canPay: boolean;
  canCancel: boolean;
  stripePortalAvailable: boolean;
  /** Trial cadastrado mas credenciais RTK ainda não provisionadas */
  needsTrialActivation: boolean;
}

export interface ClientPaymentHistoryItem {
  id: string;
  amount: number;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";
  method: string | null;
  provider: "STRIPE" | "MERCADO_PAGO" | "MANUAL";
  paidAt: string | null;
  createdAt: string;
  planName: string | null;
}
