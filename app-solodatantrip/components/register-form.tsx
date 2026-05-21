"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });
      const data = (await res.json()) as { error?: string; redirect?: string };

      if (!res.ok) {
        setError(data.error ?? "Não foi possível criar a conta.");
        return;
      }

      router.push(data.redirect ?? "/area-cliente/credenciais");
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
        <label htmlFor="name" className="block text-sm font-medium text-[#334155]">
          Nome completo
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-[#d1d9e6] bg-white px-4 py-3 text-sm text-[#0f172a] outline-none ring-accent/30 focus:border-accent focus:ring-2"
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-[#d1d9e6] bg-white px-4 py-3 text-sm text-[#0f172a] outline-none ring-accent/30 focus:border-accent focus:ring-2"
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
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-[#d1d9e6] bg-white px-4 py-3 text-sm text-[#0f172a] outline-none ring-accent/30 focus:border-accent focus:ring-2"
          placeholder="Mínimo 6 caracteres"
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
          minLength={6}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-[#d1d9e6] bg-white px-4 py-3 text-sm text-[#0f172a] outline-none ring-accent/30 focus:border-accent focus:ring-2"
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
        disabled={loading}
        className="w-full rounded-xl bg-accent py-3.5 text-sm font-semibold text-white transition hover:bg-accent-dim disabled:opacity-60"
      >
        {loading ? "Criando conta…" : "Criar conta"}
      </button>

      <p className="text-center text-sm text-[#64748b]">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
