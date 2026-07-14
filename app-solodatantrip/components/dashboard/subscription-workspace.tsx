"use client";



import { PaymentMethodsPanel } from "@/components/billing/payment-methods-panel";

import { CopyField } from "@/components/dashboard/copy-field";

import { useCallback, useEffect, useState, useTransition } from "react";

import { createRtkLicenseAction } from "@/lib/rtk/actions";

import type {

  ClientPaymentHistoryItem,

  ClientSubscriptionOverview,

} from "@/lib/billing/client-types";



type PlanOption = {

  slug: string;

  name: string;

  price: number;

  durationDays: number;

};



function formatBrl(value: number): string {

  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

}



function formatDate(iso: string | null): string {

  if (!iso) return "—";

  return new Date(iso).toLocaleDateString("pt-BR", {

    day: "2-digit",

    month: "long",

    year: "numeric",

  });

}



function statusBadgeClass(status: ClientSubscriptionOverview["status"]): string {

  if (status === "ACTIVE" || status === "TRIAL") return "bg-emerald-100 text-emerald-800";

  if (status === "OVERDUE" || status === "SUSPENDED") return "bg-red-100 text-red-800";

  if (status === "PENDING") return "bg-amber-100 text-amber-900";

  return "bg-slate-100 text-slate-700";

}



export function SubscriptionWorkspace() {

  const [overview, setOverview] = useState<ClientSubscriptionOverview | null>(null);

  const [payerEmail, setPayerEmail] = useState<string | undefined>();

  const [payments, setPayments] = useState<ClientPaymentHistoryItem[]>([]);

  const [plans, setPlans] = useState<PlanOption[]>([]);

  const [selectedPlan, setSelectedPlan] = useState("mensal");

  const [loading, setLoading] = useState(true);

  const [busy, setBusy] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  const [isActivatingTrial, startTrialTransition] = useTransition();

  const [provisionedCredentials, setProvisionedCredentials] = useState<{
    host: string;
    port: string;
    username: string;
    password: string;
    mountpoint: string;
  } | null>(null);

  const [pixData, setPixData] = useState<{

    qrCodeBase64: string;

    qrCode: string;

    ticketUrl: string | null;

  } | null>(null);



  const load = useCallback(async () => {

    setLoading(true);

    setError(null);

    try {

      const [subRes, payRes] = await Promise.all([

        fetch("/api/billing/subscription"),

        fetch("/api/billing/payments"),

      ]);

      const subJson = await subRes.json();

      const payJson = await payRes.json();



      if (!subRes.ok) throw new Error(subJson.error ?? "Erro ao carregar assinatura.");

      if (!payRes.ok) throw new Error(payJson.error ?? "Erro ao carregar pagamentos.");



      setOverview(subJson.overview);

      setPayerEmail(subJson.payerEmail);

      setPayments(payJson.payments ?? []);



      const purchasable = (subJson.purchasablePlans ?? []) as PlanOption[];

      setPlans(purchasable);

      if (purchasable.length > 0 && !purchasable.find((p: PlanOption) => p.slug === selectedPlan)) {

        setSelectedPlan(purchasable[0].slug);

      }

    } catch (err) {

      setError(err instanceof Error ? err.message : "Erro de rede.");

    } finally {

      setLoading(false);

    }

  }, [selectedPlan]);



  useEffect(() => {

    load();

  }, [load]);



  useEffect(() => {

    if (overview?.canPay && overview.planSlug) {

      setSelectedPlan(overview.planSlug);

    }

  }, [overview?.canPay, overview?.planSlug]);



  function selectedPlanInfo() {

    const fromPlans = plans.find((p) => p.slug === selectedPlan);

    if (fromPlans) {

      return { slug: fromPlans.slug, name: fromPlans.name, price: fromPlans.price };

    }

    if (overview) {

      return {

        slug: overview.planSlug,

        name: overview.planName,

        price: overview.price,

      };

    }

    return { slug: selectedPlan, name: selectedPlan, price: 0 };

  }



  async function payPix() {

    setBusy("pix");

    setError(null);

    setSuccess(null);

    setPixData(null);

    try {

      const res = await fetch("/api/pix/create", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ planSlug: selectedPlan }),

      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Falha ao gerar PIX.");

      setPixData({

        qrCodeBase64: data.qrCodeBase64,

        qrCode: data.qrCode,

        ticketUrl: data.ticketUrl,

      });

    } catch (err) {

      setError(err instanceof Error ? err.message : "Erro ao gerar PIX.");

    } finally {

      setBusy(null);

    }

  }



  async function payRecurring() {

    setBusy("recurring");

    setError(null);

    setSuccess(null);

    try {

      const res = await fetch("/api/billing/checkout-mp", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ planSlug: selectedPlan, mode: "recurring" }),

      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Falha no checkout.");

      window.location.href = data.url;

    } catch (err) {

      setError(err instanceof Error ? err.message : "Erro no checkout.");

      setBusy(null);

    }

  }



  async function payStripe() {

    setBusy("stripe");

    setError(null);

    setSuccess(null);

    try {

      const res = await fetch("/api/billing/create-checkout", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ planSlug: selectedPlan }),

      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Stripe indisponível.");

      window.location.href = data.url;

    } catch (err) {

      setError(err instanceof Error ? err.message : "Erro no Stripe.");

      setBusy(null);

    }

  }



  async function handleCardSuccess(result: {
    status: string;
    credentials?: {
      host: string;
      port: string;
      username: string;
      password: string;
      mountpoint: string;
    };
  }) {

    setSuccess(null);
    setProvisionedCredentials(null);
    setError(null);

    if (result.status === "approved") {
      if (result.credentials) {
        setProvisionedCredentials(result.credentials);
        setSuccess("Pagamento aprovado! Use as credenciais RTK abaixo na sua estação base ou rover.");
      } else {
        setSuccess("Pagamento aprovado! Sua licença RTK será ativada em instantes.");
      }
    } else {
      setSuccess("Pagamento recebido e em análise. Atualizaremos sua assinatura em breve.");
    }

    await load();

  }



  async function openStripePortal() {

    setBusy("portal");

    try {

      const res = await fetch("/api/billing/customer-portal", { method: "POST" });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Portal indisponível.");

      window.location.href = data.url;

    } catch (err) {

      setError(err instanceof Error ? err.message : "Erro no portal.");

      setBusy(null);

    }

  }



  async function cancelSubscription() {

    if (!confirm("Cancelar assinatura? Assinaturas pagas terão a licença RTK desativada.")) {

      return;

    }

    setBusy("cancel");

    setError(null);

    setSuccess(null);

    try {

      const res = await fetch("/api/billing/cancel", { method: "POST" });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Falha ao cancelar.");

      setSuccess("Assinatura cancelada com sucesso.");

      await load();

    } catch (err) {

      setError(err instanceof Error ? err.message : "Erro ao cancelar.");

    } finally {

      setBusy(null);

    }

  }



  function activateTrial() {

    setError(null);

    setSuccess(null);

    startTrialTransition(async () => {

      const result = await createRtkLicenseAction("trial");

      if (!result.success) {

        setError(result.error ?? "Não foi possível ativar o trial.");

        return;

      }

      setSuccess("Trial ativado! Suas credenciais RTK estão disponíveis em Credenciais.");

      await load();

    });

  }



  if (loading) {

    return (

      <div className="rounded-2xl border border-[#e2e8f0] bg-white p-8 text-sm text-[#64748b]">

        Carregando assinatura…

      </div>

    );

  }



  if (!overview) {

    return (

      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">

        {error ?? "Não foi possível carregar a assinatura."}

      </div>

    );

  }



  const checkoutPlan = selectedPlanInfo();



  return (

    <div className="space-y-6">

      {error ? (

        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">

          {error}

        </div>

      ) : null}

      {success ? (

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">

          {success}

          {provisionedCredentials ? (
            <div className="mt-4 space-y-2 rounded-lg border border-emerald-300 bg-white p-4 text-[#111827]">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                Credenciais NTRIP (rede RTK)
              </p>
              <CopyField label="Servidor" value={provisionedCredentials.host} />
              <CopyField label="Porta" value={provisionedCredentials.port} />
              <CopyField label="Usuário" value={provisionedCredentials.username} />
              <CopyField label="Senha" value={provisionedCredentials.password} />
              <CopyField label="Mountpoint" value={provisionedCredentials.mountpoint} />
            </div>
          ) : null}

        </div>

      ) : null}



      <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">

        <div className="flex flex-wrap items-start justify-between gap-4">

          <div>

            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">

              Plano atual

            </p>

            <h2 className="mt-1 text-2xl font-bold text-[#0f172a]">{overview.planName}</h2>

            <p className="mt-2 text-sm text-[#64748b]">

              {overview.price > 0 ? formatBrl(overview.price) : "Grátis (trial)"}

              {overview.provider ? ` · ${overview.provider === "STRIPE" ? "Stripe" : "Mercado Pago"}` : ""}

            </p>

          </div>

          <span

            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(overview.status)}`}

          >

            {overview.statusLabel}

          </span>

        </div>



        <dl className="mt-6 grid gap-4 sm:grid-cols-2">

          <div className="rounded-xl bg-[#f8fafc] p-4">

            <dt className="text-xs font-medium uppercase tracking-wide text-[#64748b]">

              Próximo vencimento

            </dt>

            <dd className="mt-1 text-lg font-semibold text-[#0f172a]">

              {formatDate(overview.nextBillingAt)}

            </dd>

          </div>

          <div className="rounded-xl bg-[#f8fafc] p-4">

            <dt className="text-xs font-medium uppercase tracking-wide text-[#64748b]">

              Fim do período

            </dt>

            <dd className="mt-1 text-lg font-semibold text-[#0f172a]">

              {formatDate(overview.currentPeriodEnd)}

            </dd>

          </div>

        </dl>



        <div className="mt-6 flex flex-wrap gap-3">

          {overview.stripePortalAvailable ? (

            <button

              type="button"

              disabled={Boolean(busy)}

              onClick={openStripePortal}

              className="rounded-xl border border-[#e2e8f0] px-4 py-2.5 text-sm font-medium text-[#0f172a] hover:bg-[#f8fafc] disabled:opacity-60"

            >

              Gerenciar no Stripe

            </button>

          ) : null}

          {overview.canCancel ? (

            <button

              type="button"

              disabled={Boolean(busy)}

              onClick={cancelSubscription}

              className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"

            >

              Cancelar assinatura

            </button>

          ) : null}

        </div>



        {overview.needsTrialActivation ? (

          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/80 p-5">

            <h3 className="text-base font-bold text-[#0f172a]">Ativar trial gratuito</h3>

            <p className="mt-1 text-sm text-[#64748b]">

              Seu cadastro está concluído, mas a licença RTK de 30 dias ainda não foi provisionada.

              Clique abaixo para gerar usuário e senha na rede.

            </p>

            <button

              type="button"

              disabled={isActivatingTrial || Boolean(busy)}

              onClick={activateTrial}

              className="btn-brand-primary mt-4 rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-60"

            >

              {isActivatingTrial ? "Provisionando…" : "Ativar licença RTK trial"}

            </button>

          </div>

        ) : null}



        {overview.canPay ? (

          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/80 p-5">

            <h3 className="text-base font-bold text-[#0f172a]">Complete seu pagamento</h3>

            <p className="mt-1 text-sm text-[#64748b]">

              Escolha PIX ou preencha os dados do cartão abaixo para ativar a licença RTK.

            </p>

            <PaymentMethodsPanel

              planSlug={checkoutPlan.slug}

              planLabel={checkoutPlan.name}

              amount={checkoutPlan.price}

              payerEmail={payerEmail}

              busy={busy}

              pixData={pixData}

              onPayPix={payPix}

              onCardSuccess={handleCardSuccess}

              onError={setError}

            />

          </div>

        ) : null}

      </section>



      {(overview.canRenew || overview.canChangePlan) && plans.length === 0 ? (

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">

          Planos pagos indisponíveis no momento. Recarregue a página ou contacte o suporte.

        </section>

      ) : null}



      {(overview.canRenew || overview.canChangePlan) && plans.length > 0 ? (

        <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">

          <h3 className="text-lg font-bold text-[#0f172a]">

            {overview.canRenew ? "Renovar ou alterar plano" : "Alterar plano"}

          </h3>

          <p className="mt-1 text-sm text-[#64748b]">

            PIX ou cartão de crédito na página. Assinatura recorrente e Stripe disponíveis como

            opções adicionais.

          </p>



          <div className="mt-4 grid gap-3 sm:grid-cols-3">

            {plans.map((plan) => (

              <button

                key={plan.slug}

                type="button"

                onClick={() => setSelectedPlan(plan.slug)}

                className={`rounded-xl border p-4 text-left transition ${

                  selectedPlan === plan.slug

                    ? "border-brand-geo bg-brand-geo/5 ring-1 ring-brand-geo/30"

                    : "border-[#e2e8f0] hover:border-brand-geo/40"

                }`}

              >

                <p className="font-semibold text-[#0f172a]">{plan.name}</p>

                <p className="mt-1 text-sm text-[#64748b]">{formatBrl(plan.price)}</p>

                <p className="mt-1 text-xs text-[#94a3b8]">{plan.durationDays} dias</p>

              </button>

            ))}

          </div>



          <PaymentMethodsPanel

            planSlug={checkoutPlan.slug}

            planLabel={checkoutPlan.name}

            amount={checkoutPlan.price}

            payerEmail={payerEmail}

            busy={busy}

            pixData={pixData}

            onPayPix={payPix}

            onCardSuccess={handleCardSuccess}

            onError={setError}

            showRecurring

            onPayRecurring={payRecurring}

            onPayStripe={payStripe}

          />

        </section>

      ) : null}



      <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">

        <h3 className="text-lg font-bold text-[#0f172a]">Histórico de pagamentos</h3>

        {payments.length === 0 ? (

          <p className="mt-3 text-sm text-[#64748b]">Nenhum pagamento registrado ainda.</p>

        ) : (

          <ul className="mt-4 divide-y divide-[#e2e8f0]">

            {payments.map((p) => (

              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">

                <div>

                  <p className="font-medium text-[#0f172a]">

                    {p.planName ?? "Assinatura RTK"} · {formatBrl(p.amount)}

                  </p>

                  <p className="text-[#64748b]">

                    {p.method ?? p.provider} ·{" "}

                    {p.paidAt ? formatDate(p.paidAt) : formatDate(p.createdAt)}

                  </p>

                </div>

                <span

                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${

                    p.status === "PAID"

                      ? "bg-emerald-100 text-emerald-800"

                      : p.status === "FAILED"

                        ? "bg-red-100 text-red-800"

                        : "bg-amber-100 text-amber-900"

                  }`}

                >

                  {p.status === "PAID" ? "Pago" : p.status === "FAILED" ? "Recusado" : "Pendente"}

                </span>

              </li>

            ))}

          </ul>

        )}

      </section>

    </div>

  );

}


