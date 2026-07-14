"use client";

import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import { useEffect, useMemo, useState } from "react";

type CardPaymentCredentials = {
  host: string;
  port: string;
  username: string;
  password: string;
  mountpoint: string;
};

type MercadoPagoCardPaymentProps = {
  amount: number;
  planSlug: string;
  payerEmail?: string;
  disabled?: boolean;
  onSuccess: (result: { status: string; credentials?: CardPaymentCredentials }) => void | Promise<void>;
  onError?: (message: string) => void;
};

let mercadoPagoInitialized = false;

export function MercadoPagoCardPayment({
  amount,
  planSlug,
  payerEmail,
  disabled,
  onSuccess,
  onError,
}: MercadoPagoCardPaymentProps) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState(true);
  const [keyError, setKeyError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/mp-config");
        const data = (await res.json()) as { configured?: boolean; publicKey?: string; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Falha ao carregar Mercado Pago.");
        if (!data.configured || !data.publicKey) {
          throw new Error(
            "Chave pública do Mercado Pago não configurada (MERCADOPAGO_PUBLIC_KEY).",
          );
        }
        if (!cancelled) setPublicKey(data.publicKey);
      } catch (err) {
        if (!cancelled) {
          setKeyError(err instanceof Error ? err.message : "Mercado Pago indisponível.");
        }
      } finally {
        if (!cancelled) setLoadingKey(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!publicKey || mercadoPagoInitialized) return;
    initMercadoPago(publicKey, { locale: "pt-BR" });
    mercadoPagoInitialized = true;
  }, [publicKey]);

  const initialization = useMemo(
    () => ({
      amount,
      payer: payerEmail ? { email: payerEmail } : undefined,
    }),
    [amount, payerEmail],
  );

  if (loadingKey) {
    return (
      <p className="text-sm text-[#64748b]">Carregando formulário de cartão…</p>
    );
  }

  if (keyError || !publicKey) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {keyError ?? "Formulário de cartão indisponível."}
      </div>
    );
  }

  if (disabled) {
    return (
      <p className="text-sm text-[#64748b]">Aguarde…</p>
    );
  }

  return (
    <div className="mp-card-payment rounded-xl border border-[#e2e8f0] bg-white p-4">
      <CardPayment
        locale="pt-BR"
        initialization={initialization}
        customization={{
          paymentMethods: {
            maxInstallments: 12,
            minInstallments: 1,
          },
          visual: {
            style: {
              theme: "default",
            },
          },
        }}
        onSubmit={async (formData) => {
          const res = await fetch("/api/billing/pay-card", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              planSlug,
              ...formData,
            }),
          });
          const data = (await res.json()) as {
            error?: string;
            status?: string;
            credentials?: CardPaymentCredentials;
          };
          if (!res.ok) {
            const message = data.error ?? "Pagamento recusado.";
            onError?.(message);
            throw new Error(message);
          }
          await onSuccess({
            status: data.status ?? "approved",
            credentials: data.credentials,
          });
        }}
        onError={(error) => {
          const message =
            typeof error === "object" && error && "message" in error
              ? String((error as { message?: string }).message)
              : "Erro no formulário de cartão.";
          onError?.(message);
        }}
      />
    </div>
  );
}
