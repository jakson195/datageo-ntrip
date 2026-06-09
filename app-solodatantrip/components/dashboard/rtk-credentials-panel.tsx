"use client";

import { useState, useTransition } from "react";
import type { SessionUser } from "@/lib/auth";
import { getRtkCredentialsAction } from "@/lib/rtk/actions";
import { CopyField } from "./copy-field";
import { RtkLicenseStatusCardInner } from "./rtk-license-status-card";
import { ToastProvider, useToast } from "./toast";

function formatExpiry(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function RtkCredentialsPanelInner({ user }: { user: SessionUser }) {
  const { pushToast } = useToast();
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isExpired = user.subscription.status === "expired";
  const pending =
    !isExpired &&
    (user.subscription.status === "pending" ||
      !user.credentialsActive ||
      user.ntrip.username === "NONE");
  const isActiveTrial =
    user.subscription.status === "active" && user.subscription.plan === "trial";

  const statusLabels: Record<SessionUser["subscription"]["status"], string> = {
    pending: "Pendente",
    active: "Ativa",
    suspended: "Suspensa",
    expired: "Expirada",
  };

  const statusColors: Record<SessionUser["subscription"]["status"], string> = {
    pending: "bg-amber-100 text-amber-800",
    active: "bg-emerald-100 text-emerald-800",
    suspended: "bg-red-100 text-red-800",
    expired: "bg-slate-200 text-slate-800",
  };

  function handleRevealPassword() {
    startTransition(async () => {
      const result = await getRtkCredentialsAction();
      if (!result.success) {
        pushToast({
          variant: "error",
          title: "Senha indisponível",
          description: result.error,
        });
        return;
      }
      setRevealedPassword(result.credentials.password);
    });
  }

  async function handleCopyPassword() {
    const result = await getRtkCredentialsAction();
    if (!result.success) {
      pushToast({
        variant: "error",
        title: "Não foi possível copiar",
        description: result.error,
      });
      return;
    }
    await navigator.clipboard.writeText(result.credentials.password);
    pushToast({ variant: "success", title: "Senha copiada" });
  }

  const passwordDisplay = revealedPassword ?? user.ntrip.password;

  return (
    <div className="space-y-6">
      <RtkLicenseStatusCardInner user={user} />

      {isActiveTrial && !pending && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
          <p className="font-semibold">Trial NTRIP ativo</p>
          <p className="mt-1 text-emerald-800">
            Suas credenciais estão prontas. Validade até{" "}
            <strong>{formatExpiry(user.expiryDate)}</strong> (30 dias grátis).
          </p>
        </div>
      )}

      {isExpired && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900">
          <p className="font-semibold">Trial expirado</p>
          <p className="mt-1 text-red-800">
            O período de avaliação terminou. Escolha um plano em{" "}
            <a href="/area-cliente/planos" className="font-medium underline">
              Planos
            </a>{" "}
            para reativar o acesso NTRIP.
          </p>
        </div>
      )}

      {pending && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
          <p className="font-semibold">Conta aguardando ativação</p>
          <p className="mt-1 text-amber-800">
            Seu cadastro foi concluído, mas o trial de 30 dias ainda não foi provisionado. Clique em{" "}
            <strong>Ativar licença RTK</strong> acima para gerar usuário e senha. Enquanto isso, use
            os dados do servidor abaixo para preparar o equipamento ou{" "}
            <a href="/#contato" className="font-medium text-brand-geo underline">
              fale com o suporte
            </a>
            .
          </p>
        </div>
      )}

      <section className="rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#111827]">Resumo da conta</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
              Fluxos simultâneos
            </dt>
            <dd className="mt-1 text-lg font-semibold text-[#111827]">{user.streams}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
              Validade da assinatura
            </dt>
            <dd className="mt-1 text-lg font-semibold text-[#111827]">
              {formatExpiry(user.expiryDate)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
              Plano
            </dt>
            <dd className="mt-1 text-sm font-medium text-[#111827]">{user.subscription.label}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
              Status
            </dt>
            <dd className="mt-1">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[user.subscription.status]}`}
              >
                {statusLabels[user.subscription.status]}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border-2 border-brand-geo/30 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold text-[#111827]">Seus dados de login RTK</h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          A senha é protegida no servidor. Use &quot;Ver&quot; ou &quot;Copiar&quot; para acessá-la com segurança.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <CopyField label="Usuário RTK" value={user.ntrip.username} />
          <div className="rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
              Senha RTK
            </p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="min-w-0 flex-1 font-mono text-sm font-medium text-[#111827]">
                {passwordDisplay}
              </p>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (revealedPassword) {
                      setRevealedPassword(null);
                      return;
                    }
                    handleRevealPassword();
                  }}
                  disabled={isPending || pending || isExpired}
                  className="rounded-lg border border-[#d1d5db] bg-white px-2.5 py-1.5 text-xs text-[#374151] hover:border-brand-geo disabled:opacity-50"
                >
                  {revealedPassword ? "Ocultar" : "Ver"}
                </button>
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  disabled={pending || isExpired}
                  className="rounded-lg border border-[#d1d5db] bg-white px-2.5 py-1.5 text-xs font-medium text-[#374151] hover:border-brand-geo hover:text-brand-geo disabled:opacity-50"
                >
                  Copiar
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold text-[#111827]">Configuração do servidor</h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          Host, porta e ponto de montagem (mountpoint) do caster NTRIP.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CopyField label="Host NTRIP" value={user.ntrip.server} />
          <CopyField label="Porta" value={user.ntrip.port} />
          <CopyField label="Mountpoint" value={user.ntrip.mountpoint} />
        </div>
      </section>
    </div>
  );
}

export function RtkCredentialsPanel({ user }: { user: SessionUser }) {
  return (
    <ToastProvider>
      <RtkCredentialsPanelInner user={user} />
    </ToastProvider>
  );
}
