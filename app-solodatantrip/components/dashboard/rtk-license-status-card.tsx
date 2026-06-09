"use client";

import { useMemo, useState, useTransition } from "react";
import type { SessionUser } from "@/lib/auth";
import {
  createRtkLicenseAction,
  getRtkCredentialsAction,
  renewRtkLicenseAction,
} from "@/lib/rtk/actions";
import { ToastProvider, useToast } from "./toast";

function formatExpiry(iso: string | null | undefined): string {
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

function formatMode(mode: string | undefined): string {
  if (mode === "production") return "Produção";
  if (mode === "test") return "Sandbox";
  return "—";
}

function shortLicenseId(id: string | null | undefined): string {
  if (!id) return "—";
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

type LicenseStatus = "pending" | "active" | "expired" | "suspended";

function resolveUiStatus(user: SessionUser): LicenseStatus {
  const raw = user.rtkLicense?.status?.toLowerCase();
  if (raw === "suspended") return "suspended";
  if (raw === "expired") return "expired";

  const expiresAt = user.rtkLicense?.expiresAt ?? user.expiryDate;
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return "expired";

  if (
    user.credentialsActive &&
    user.ntrip.username !== "NONE" &&
    (raw === "active" || user.subscription.status === "active")
  ) {
    return "active";
  }

  return "pending";
}

const STATUS_CONFIG: Record<
  LicenseStatus,
  { label: string; badge: string; dot: string }
> = {
  pending: {
    label: "Pendente",
    badge: "bg-amber-100 text-amber-800 ring-amber-200",
    dot: "bg-amber-400",
  },
  active: {
    label: "Ativa",
    badge: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-500 animate-pulse",
  },
  expired: {
    label: "Expirada",
    badge: "bg-red-100 text-red-800 ring-red-200",
    dot: "bg-red-400",
  },
  suspended: {
    label: "Suspensa",
    badge: "bg-slate-200 text-slate-800 ring-slate-300",
    dot: "bg-slate-400",
  },
};

export function RtkLicenseStatusCardInner({ user }: { user: SessionUser }) {
  const { pushToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [action, setAction] = useState<"create" | "renew" | "copy" | null>(null);

  const license = user.rtkLicense;
  const status = useMemo(() => resolveUiStatus(user), [user]);
  const statusConfig = STATUS_CONFIG[status];
  const isOnline = status === "active";
  const canCreate = status === "pending";
  const canRenew = status === "expired" || status === "suspended";
  const canCopy = status === "active";

  function handleCreate() {
    setAction("create");
    startTransition(async () => {
      const result = await createRtkLicenseAction("trial");
      setAction(null);

      if (!result.success) {
        pushToast({
          variant: "error",
          title: "Falha ao ativar licença",
          description: result.error,
        });
        return;
      }

      pushToast({
        variant: "success",
        title: result.replayed ? "Licença recuperada" : "Licença ativada",
        description: "Suas credenciais RTK foram atualizadas.",
      });
      window.setTimeout(() => window.location.reload(), 900);
    });
  }

  function handleRenew() {
    setAction("renew");
    startTransition(async () => {
      const result = await renewRtkLicenseAction();
      setAction(null);

      if (!result.success) {
        pushToast({
          variant: "error",
          title: "Falha ao renovar licença",
          description: result.error,
        });
        return;
      }

      pushToast({
        variant: "success",
        title: "Licença renovada",
        description: "Novas credenciais RTK disponíveis.",
      });
      window.setTimeout(() => window.location.reload(), 900);
    });
  }

  function handleCopyCredentials() {
    setAction("copy");
    startTransition(async () => {
      const result = await getRtkCredentialsAction();
      setAction(null);

      if (!result.success) {
        pushToast({
          variant: "error",
          title: "Não foi possível copiar",
          description: result.error,
        });
        return;
      }

      const { credentials: creds } = result;
      const text = [
        `Usuário: ${creds.username}`,
        `Senha: ${creds.password}`,
        `Servidor: ${creds.server}`,
        `Porta: ${creds.port}`,
        `Mountpoint: ${creds.mountpoint}`,
      ].join("\n");

      await navigator.clipboard.writeText(text);
      pushToast({
        variant: "success",
        title: "Credenciais copiadas",
        description: "Dados RTK copiados para a área de transferência.",
      });
    });
  }

  const loading = isPending && action !== null;

  return (
    <section className="rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#111827]">Licença RTK</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f3f4f6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
              <span className={`h-2 w-2 rounded-full ${statusConfig.dot}`} />
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#6b7280]">
            Provisionamento seguro via backend · ambiente {formatMode(license?.mode)}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusConfig.badge}`}
        >
          {statusConfig.label}
        </span>
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
            ID da licença
          </dt>
          <dd className="mt-1 font-mono text-sm font-medium text-[#111827]">
            {shortLicenseId(license?.licenseId ?? user.rtkLicenseId)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
            Usuário
          </dt>
          <dd className="mt-1 font-mono text-sm font-medium text-[#111827]">
            {user.ntrip.username}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
            Mountpoint
          </dt>
          <dd className="mt-1 font-mono text-sm font-medium text-[#111827]">
            {user.ntrip.mountpoint}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
            Validade
          </dt>
          <dd className="mt-1 text-sm font-medium text-[#111827]">
            {formatExpiry(license?.expiresAt ?? user.expiryDate)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
            Plano
          </dt>
          <dd className="mt-1 text-sm font-medium capitalize text-[#111827]">
            {license?.plan ?? user.subscription.plan}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
            Senha
          </dt>
          <dd className="mt-1 font-mono text-sm font-medium text-[#111827]">
            {user.ntrip.password}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap gap-2">
        {canCreate && (
          <button
            type="button"
            onClick={handleCreate}
            disabled={loading}
            className="btn-brand-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {loading && action === "create" ? "Provisionando…" : "Ativar licença RTK"}
          </button>
        )}

        {canRenew && (
          <button
            type="button"
            onClick={handleRenew}
            disabled={loading}
            className="rounded-lg border border-brand-geo/40 bg-brand-geo/10 px-4 py-2 text-sm font-semibold text-brand-geo hover:bg-brand-geo/20 disabled:opacity-60"
          >
            {loading && action === "renew" ? "Renovando…" : "Renovar licença"}
          </button>
        )}

        {canCopy && (
          <button
            type="button"
            onClick={handleCopyCredentials}
            disabled={loading}
            className="rounded-lg border border-[#d1d5db] bg-white px-4 py-2 text-sm font-semibold text-[#374151] hover:border-brand-geo disabled:opacity-60"
          >
            {loading && action === "copy" ? "Copiando…" : "Copiar credenciais"}
          </button>
        )}
      </div>
    </section>
  );
}

export function RtkLicenseStatusCard({ user }: { user: SessionUser }) {
  return (
    <ToastProvider>
      <RtkLicenseStatusCardInner user={user} />
    </ToastProvider>
  );
}
