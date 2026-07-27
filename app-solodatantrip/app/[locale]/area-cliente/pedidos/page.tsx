"use client";

import { useCallback, useEffect, useState } from "react";
import { runQueuedInEffect } from "@/lib/react/queue-in-effect";
import { PageHeading } from "@/components/dashboard/page-heading";
import type { ClientPaymentHistoryItem } from "@/lib/billing/client-types";

function formatBrl(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PedidosPage() {
  const [payments, setPayments] = useState<ClientPaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/payments");
      const data = await res.json();
      if (res.ok) setPayments(data.payments ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => runQueuedInEffect(() => void load()), [load]);

  return (
    <main className="flex-1 bg-[#f3f4f6] p-4 sm:p-8">
      <PageHeading
        title="Seus pedidos"
        description="Histórico de pagamentos e renovações da assinatura."
      />
      <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
        {loading ? (
          <p className="text-sm text-[#64748b]">Carregando…</p>
        ) : payments.length === 0 ? (
          <p className="text-sm text-[#64748b]">Nenhum pedido registrado.</p>
        ) : (
          <ul className="divide-y divide-[#e2e8f0]">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
                <div>
                  <p className="font-semibold text-[#0f172a]">
                    {p.planName ?? "Assinatura RTK"}
                  </p>
                  <p className="text-[#64748b]">
                    {formatBrl(p.amount)} · {p.method ?? p.provider} · {formatDate(p.paidAt ?? p.createdAt)}
                  </p>
                </div>
                <span className="text-xs font-semibold uppercase text-[#64748b]">{p.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
