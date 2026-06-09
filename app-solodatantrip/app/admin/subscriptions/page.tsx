"use client";

import { useCallback, useEffect, useState } from "react";

interface AdminSubscriptionRow {
  id: string;
  status: string;
  source: string;
  plan: string;
  planName: string;
  userId: string;
  userEmail: string;
  userName: string;
  expiresAt: string | null;
  activatedAt: string | null;
  createdAt: string;
  ntrip: {
    host: string;
    port: string;
    mountpoint: string;
    username: string;
    status: string;
  } | null;
}

export default function AdminSubscriptionsPage() {
  const [rows, setRows] = useState<AdminSubscriptionRow[]>([]);
  const [filter, setFilter] = useState("PENDING");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = sessionStorage.getItem("admin_token") ?? prompt("Admin token (ADMIN_SECRET):");
      if (!token) return;
      sessionStorage.setItem("admin_token", token);

      const res = await fetch(`/api/admin/subscriptions?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao carregar.");
        return;
      }
      setRows(data.subscriptions ?? []);
    } catch {
      setError("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function activate(userId: string, plan: string) {
    setActivatingId(userId);
    try {
      const token = sessionStorage.getItem("admin_token");
      if (!token) return;

      const res = await fetch("/api/admin/subscriptions/activate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, planSlug: plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Falha na ativação.");
        return;
      }
      await load();
    } finally {
      setActivatingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#0f172a] p-6 text-white sm:p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold">Assinaturas NTRIP</h1>
        <p className="mt-1 text-sm text-slate-400">
          Ativação manual e monitoramento de contas pendentes.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {["PENDING", "ACTIVE", "SUSPENDED", "EXPIRED", "ALL"].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                filter === value ? "bg-brand-geo text-white" : "bg-slate-800 text-slate-300"
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        {loading && <p className="mt-6 text-slate-400">Carregando…</p>}
        {error && <p className="mt-6 text-red-400">{error}</p>}

        {!loading && !error && (
          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-700">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">NTRIP</th>
                  <th className="px-4 py-3">Validade</th>
                  <th className="px-4 py-3">Ação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-800">
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.userName}</p>
                      <p className="text-xs text-slate-400">{row.userEmail}</p>
                    </td>
                    <td className="px-4 py-3">{row.planName}</td>
                    <td className="px-4 py-3 capitalize">{row.status}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.ntrip ? (
                        <>
                          {row.ntrip.username}
                          <br />
                          {row.ntrip.host}:{row.ntrip.port}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.expiresAt
                        ? new Date(row.expiresAt).toLocaleDateString("pt-BR")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {row.status === "pending" && (
                        <button
                          type="button"
                          disabled={activatingId === row.userId}
                          onClick={() => activate(row.userId, row.plan)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                        >
                          {activatingId === row.userId ? "Ativando…" : "Ativar"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="px-4 py-8 text-center text-slate-400">Nenhuma assinatura encontrada.</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
