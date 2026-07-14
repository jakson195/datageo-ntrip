"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const MercadoPagoCardPayment = dynamic(
  () =>
    import("@/components/billing/mercadopago-card-payment").then(
      (m) => m.MercadoPagoCardPayment,
    ),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-[#64748b]">Carregando formulário de cartão…</p>
    ),
  },
);

type PixData = {
  qrCodeBase64: string;
  qrCode: string;
  ticketUrl: string | null;
};

type CardPaymentCredentials = {
  host: string;
  port: string;
  username: string;
  password: string;
  mountpoint: string;
};

type PaymentMethodsPanelProps = {
  planSlug: string;
  planLabel: string;
  amount: number;
  payerEmail?: string;
  busy: string | null;
  pixData: PixData | null;
  onPayPix: () => void;
  onCardSuccess: (result: { status: string; credentials?: CardPaymentCredentials }) => void | Promise<void>;
  onError: (message: string) => void;
  showRecurring?: boolean;
  onPayRecurring?: () => void;
  onPayStripe?: () => void;
};

export function PaymentMethodsPanel({
  planSlug,
  planLabel,
  amount,
  payerEmail,
  busy,
  pixData,
  onPayPix,
  onCardSuccess,
  onError,
  showRecurring,
  onPayRecurring,
  onPayStripe,
}: PaymentMethodsPanelProps) {
  const [method, setMethod] = useState<"pix" | "card">("pix");

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMethod("pix")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            method === "pix"
              ? "bg-brand-geo text-white"
              : "border border-[#e2e8f0] bg-white text-[#334155] hover:border-brand-geo/40"
          }`}
        >
          PIX
        </button>
        <button
          type="button"
          onClick={() => setMethod("card")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            method === "card"
              ? "bg-brand-geo text-white"
              : "border border-[#e2e8f0] bg-white text-[#334155] hover:border-brand-geo/40"
          }`}
        >
          Cartão de crédito
        </button>
      </div>

      <p className="mt-3 text-sm font-medium text-[#0f172a]">
        {planLabel} ·{" "}
        {amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </p>

      {method === "pix" ? (
        <div className="mt-4">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={onPayPix}
            className="rounded-xl btn-brand-primary px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {busy === "pix" ? "Gerando PIX…" : "Gerar QR Code PIX"}
          </button>
          {pixData ? (
            <div className="mt-5 rounded-xl border border-[#e2e8f0] bg-white p-4">
              <p className="text-sm font-semibold text-[#0f172a]">PIX gerado — escaneie ou copie</p>
              {pixData.qrCodeBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                  alt="QR Code PIX"
                  className="mx-auto mt-4 h-48 w-48"
                />
              ) : null}
              <p className="mt-3 break-all rounded-lg bg-[#f8fafc] p-3 font-mono text-xs text-[#334155]">
                {pixData.qrCode}
              </p>
              {pixData.ticketUrl ? (
                <a
                  href={pixData.ticketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-sm text-brand-geo hover:underline"
                >
                  Abrir comprovante PIX →
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-4">
          <MercadoPagoCardPayment
            amount={amount}
            planSlug={planSlug}
            payerEmail={payerEmail}
            disabled={Boolean(busy)}
            onSuccess={onCardSuccess}
            onError={onError}
          />
        </div>
      )}

      {showRecurring ? (
        <div className="mt-6 flex flex-wrap gap-3 border-t border-[#e2e8f0] pt-4">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={onPayRecurring}
            className="rounded-xl border border-[#e2e8f0] px-5 py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {busy === "recurring" ? "Abrindo…" : "Assinatura recorrente (MP)"}
          </button>
          {onPayStripe ? (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={onPayStripe}
              className="rounded-xl border border-[#e2e8f0] px-5 py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {busy === "stripe" ? "Abrindo…" : "Stripe (cartão internacional)"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
