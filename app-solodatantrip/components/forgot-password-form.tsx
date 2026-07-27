"use client";

import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setDevResetUrl(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        devResetUrl?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "Não foi possível enviar o pedido.");
        return;
      }

      setMessage(
        data.message ??
          "Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.",
      );
      if (data.devResetUrl) {
        setDevResetUrl(data.devResetUrl);
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm text-[#64748b]">
        Informe o e-mail da sua conta. Enviaremos um link para criar uma nova senha.
      </p>
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

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}
      {devResetUrl ? (
        <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900">
          <p className="font-medium">Ambiente local — clique para redefinir sua senha:</p>
          <a
            href={devResetUrl}
            className="inline-flex w-full items-center justify-center rounded-xl bg-[#1d6ecf] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1558a8]"
          >
            Abrir página de nova senha
          </a>
          <p className="break-all text-xs text-blue-800/80">{devResetUrl}</p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-accent py-3.5 text-sm font-semibold text-white transition hover:bg-accent-dim disabled:opacity-60"
      >
        {loading ? "Enviando…" : "Enviar link de recuperação"}
      </button>

      <p className="text-center text-xs text-[#64748b]">
        <Link href="/login" className="text-accent hover:underline">
          Voltar ao login
        </Link>
      </p>
    </form>
  );
}
