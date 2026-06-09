import type { SessionUser } from "@/lib/auth-types";

const ACTIVE_SUBSCRIPTION_PATHS = [
  "/area-cliente/cobertura",
  "/area-cliente/uso",
  "/area-cliente/rede",
  "/area-cliente/configuracao",
];

export function isSessionPastExpiry(session: SessionUser): boolean {
  if (!session.expiryDate) return false;
  return new Date(session.expiryDate).getTime() < Date.now();
}

export function isSubscriptionActive(session: SessionUser): boolean {
  if (session.subscription.status === "expired") return false;
  if (isSessionPastExpiry(session)) return false;
  return session.subscription.status === "active" && session.credentialsActive;
}

export function requiresActiveSubscription(pathname: string): boolean {
  return ACTIVE_SUBSCRIPTION_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function subscriptionBlockReason(session: SessionUser): string | null {
  if (isSubscriptionActive(session)) return null;

  if (isSessionPastExpiry(session) || session.subscription.status === "expired") {
    return "Seu trial NTRIP de 30 dias expirou. Escolha um plano para continuar.";
  }

  switch (session.subscription.status) {
    case "pending":
      return "Sua assinatura NTRIP ainda não foi ativada.";
    case "suspended":
      return "Sua assinatura NTRIP está suspensa. Regularize o pagamento ou fale com o suporte.";
    default:
      return "Assinatura NTRIP inativa.";
  }
}
