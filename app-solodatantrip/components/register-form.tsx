"use client";

import Link from "next/link";
import { useState } from "react";
import { clientFetch } from "@/lib/client-fetch";

type RegisterFormProps = {
  disabled?: boolean;
};

export function RegisterForm({ disabled = false }: RegisterFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    setError(null);
    setLoading(true);

    try {
      const res = await clientFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });
      const data = (await res.json()) as { error?: string; redirect?: string };

      if (!res.ok) {
        setError(data.error ?? "Não foi possível criar a conta.");
        return;
      }

      window.location.assign(data.redirect ?? "/area-cliente/credenciais");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-[#334155]">
          Nome completo
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          required
          disabled={disabled || loading}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-[#d1d9e6] bg-white px-4 py-3 text-sm text-[#0f172a] outline-none ring-brand-geo/30 focus:border-brand-geo focus:ring-2 disabled:opacity-60"
          placeholder="Seu nome"
        />
      </div>
      <div>
        <label htmlFor="reg-email" className="block text-sm font-medium text-[#334155]">
          E-mail
        </label>
        <input
          id="reg-email"
          type="email"
          autoComplete="email"
          required
          disabled={disabled || loading}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-[#d1d9e6] bg-white px-4 py-3 text-sm text-[#0f172a] outline-none ring-brand-geo/30 focus:border-brand-geo focus:ring-2 disabled:opacity-60"
          placeholder="seu@email.com"
        />
      </div>
      <div>
        <label htmlFor="reg-password" className="block text-sm font-medium text-[#334155]">
          Senha
        </label>
        <input
          id="reg-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          disabled={disabled || loading}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-[#d1d9e6] bg-white px-4 py-3 text-sm text-[#0f172a] outline-none ring-brand-geo/30 focus:border-brand-geo focus:ring-2 disabled:opacity-60"
          placeholder="Mín. 8 caracteres, letras e números"
        />
      </div>
      <div>
        <label htmlFor="confirm-password" className="block text-sm font-medium text-[#334155]">
          Confirmar senha
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          disabled={disabled || loading}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-[#d1d9e6] bg-white px-4 py-3 text-sm text-[#0f172a] outline-none ring-brand-geo/30 focus:border-brand-geo focus:ring-2 disabled:opacity-60"
          placeholder="Repita a senha"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={disabled || loading}
        className="w-full rounded-xl btn-brand-primary py-3.5 text-sm disabled:opacity-60"
      >
        {loading ? "A ativar NTRIP…" : "Criar conta e ativar trial"}
      </button>

      <p className="text-center text-sm text-[#64748b]">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-brand-geo hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
