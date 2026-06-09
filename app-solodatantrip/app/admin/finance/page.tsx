"use client";

import { useEffect, useState } from "react";

interface FinanceStats {
  mrr: number;
  arr: number;
  activeCustomers: number;
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

function formatBrl(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AdminFinancePage() {
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = sessionStorage.getItem("admin_token") ?? prompt("Admin token (ADMIN_SECRET):");
        if (!token) return;
        sessionStorage.setItem("admin_token", token);

        const res = await fetch("/api/admin/finance/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Erro ao carregar.");
          return;
        }
        setStats(data.stats);
      } catch {
        setError("Erro de rede.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0f172a] p-8 text-white">
        <p>Carregando dashboard financeiro…</p>
      </main>
    );
  }

  if (error || !stats) {
    return (
      <main className="min-h-screen bg-[#0f172a] p-8 text-white">
        <p className="text-red-400">{error ?? "Sem dados."}</p>
      </main>
    );
  }

  const maxRevenue = Math.max(...stats.monthlyGrowth.map((m) => m.revenue), 1);

  return (
    <main className="min-h-screen bg-[#0f172a] p-6 text-white sm:p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-bold">Dashboard Financeiro RTK SaaS</h1>
        <p className="mt-1 text-sm text-slate-400">MRR, ARR, churn e receita em tempo real</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "MRR", value: formatBrl(stats.mrr), color: "text-emerald-400" },
            { label: "ARR", value: formatBrl(stats.arr), color: "text-emerald-400" },
            { label: "Receita mensal", value: formatBrl(stats.monthlyRevenue), color: "text-blue-400" },
            { label: "Inadimplência", value: formatBrl(stats.overdueAmount), color: "text-red-400" },
            { label: "Clientes ativos", value: String(stats.activeCustomers), color: "text-white" },
            { label: "Licenças RTK", value: String(stats.activeLicenses), color: "text-white" },
            { label: "Churn", value: `${stats.churnRate}%`, color: "text-amber-400" },
            { label: "Conversão trial", value: `${stats.trialConversionRate}%`, color: "text-purple-400" },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
              <p className="text-xs uppercase tracking-wide text-slate-400">{card.label}</p>
              <p className={`mt-2 text-2xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <h2 className="font-semibold">Crescimento mensal</h2>
            <div className="mt-4 flex h-48 items-end gap-2">
              {stats.monthlyGrowth.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-brand-geo"
                    style={{ height: `${(m.revenue / maxRevenue) * 100}%`, minHeight: 4 }}
                  />
                  <span className="text-[10px] text-slate-400">{m.month}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <h2 className="font-semibold">Receita por plano</h2>
            <ul className="mt-4 space-y-3">
              {stats.revenueByPlan.map((p) => (
                <li key={p.plan} className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{p.plan}</span>
                  <span className="font-mono text-emerald-400">
                    {formatBrl(p.revenue)} · {p.count} pag.
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-sm">
            <span className="text-slate-400">Novos clientes este mês:</span>{" "}
            <strong>{stats.newCustomersThisMonth}</strong>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-sm">
            <span className="text-slate-400">Renovações este mês:</span>{" "}
            <strong>{stats.renewalsThisMonth}</strong>
          </div>
        </div>
      </div>
    </main>
  );
}
