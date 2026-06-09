"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { clientFetch } from "@/lib/client-fetch";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/area-cliente/credenciais";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await clientFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string; redirect?: string };

      if (!res.ok) {
        setError(data.error ?? "Não foi possível entrar.");
        return;
      }

      window.location.assign(data.redirect ?? next);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-[#334155]">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-sm text-[#0f172a] outline-none ring-brand-geo/30 focus:border-brand-geo focus:ring-2"
          placeholder="seu@email.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-[#334155]">
          Senha
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-sm text-[#0f172a] outline-none ring-brand-geo/30 focus:border-brand-geo focus:ring-2"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl btn-brand-primary py-3.5 text-sm disabled:opacity-60"
      >
        {loading ? "Entrando…" : "Entrar"}
      </button>

      <p className="text-center text-xs text-[#64748b]">
        <Link href="/" className="text-brand-geo hover:underline">
          Voltar ao site
        </Link>
      </p>
    </form>
  );
}
