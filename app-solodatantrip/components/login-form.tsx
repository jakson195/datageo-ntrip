"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string; redirect?: string };

      if (!res.ok) {
        setError(data.error ?? "Não foi possível entrar.");
        return;
      }

      router.push(data.redirect ?? next);
      router.refresh();
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
          className="mt-1.5 w-full rounded-xl border border-[#d1d9e6] bg-white px-4 py-3 text-sm text-[#0f172a] outline-none ring-accent/30 focus:border-accent focus:ring-2"
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
          className="mt-1.5 w-full rounded-xl border border-[#d1d9e6] bg-white px-4 py-3 text-sm text-[#0f172a] outline-none ring-accent/30 focus:border-accent focus:ring-2"
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
        className="w-full rounded-xl bg-accent py-3.5 text-sm font-semibold text-white transition hover:bg-accent-dim disabled:opacity-60"
      >
        {loading ? "Entrando…" : "Entrar"}
      </button>

      <p className="text-center text-xs text-[#64748b]">
        <Link href="/" className="text-accent hover:underline">
          Voltar ao site
        </Link>
      </p>
    </form>
  );
}
