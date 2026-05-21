"use client";

import { useState } from "react";
import type { SessionUser } from "@/lib/auth";
import { CopyField } from "./copy-field";

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

export function RtkCredentialsPanel({ user }: { user: SessionUser }) {
  const [showPassword, setShowPassword] = useState(false);
  const pending = !user.credentialsActive || user.ntrip.username === "NONE";

  return (
    <div className="space-y-6">
      {pending && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
          <p className="font-semibold">Conta aguardando ativação</p>
          <p className="mt-1 text-amber-800">
            Seu cadastro foi concluído. Assim que a assinatura for ativada, usuário e senha RTK
            aparecerão aqui. Enquanto isso, use os dados do servidor abaixo para preparar o
            equipamento ou{" "}
            <a href="/#contato" className="font-medium text-[#1d6ecf] underline">
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
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  user.subscription.status === "ativo"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {user.subscription.status === "ativo" ? "Ativo" : "Inativo"}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border-2 border-[#1d6ecf]/30 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold text-[#111827]">Seus dados de login RTK</h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          Informe usuário e senha no rover, controlador DJI, Emlid ou outro receptor GNSS.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <CopyField label="Usuário RTK" value={user.ntrip.username} />
          <div className="rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
              Senha RTK
            </p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="min-w-0 flex-1 font-mono text-sm font-medium text-[#111827]">
                {showPassword ? user.ntrip.password : "••••••••••••"}
              </p>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="rounded-lg border border-[#d1d5db] bg-white px-2.5 py-1.5 text-xs text-[#374151] hover:border-[#1d6ecf]"
                >
                  {showPassword ? "Ocultar" : "Ver"}
                </button>
                <CopyButton value={user.ntrip.password} />
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
          <CopyField label="Servidor" value={user.ntrip.server} />
          <CopyField label="Porta" value={user.ntrip.port} />
          <CopyField label="Ponto de montagem" value={user.ntrip.mountpoint} />
        </div>
      </section>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="rounded-lg border border-[#d1d5db] bg-white px-2.5 py-1.5 text-xs font-medium text-[#374151] hover:border-[#1d6ecf] hover:text-[#1d6ecf]"
    >
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}
