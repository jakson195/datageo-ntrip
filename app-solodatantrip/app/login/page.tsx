import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export const metadata = {
  title: "Login | Datageo Ntrip",
  description: "Área do cliente — credenciais NTRIP e assinatura.",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#eef2f6]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-12 sm:px-6">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="mb-8 flex items-center justify-center gap-2 font-semibold text-[#0f172a]">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-sm text-white">
              DG
            </span>
            <span>
              Datageo <span className="text-accent">Ntrip</span>
            </span>
          </Link>

          <div className="rounded-2xl border border-[#d8e0eb] bg-white p-8 shadow-[0_8px_40px_rgba(15,23,42,0.08)]">
            <h1 className="text-center text-2xl font-bold text-[#0f172a]">Área do cliente</h1>
            <p className="mt-2 text-center text-sm text-[#64748b]">
              Acesse suas credenciais NTRIP e dados da assinatura.
            </p>
            <div className="mt-8">
              <Suspense fallback={<p className="text-center text-sm text-[#64748b]">Carregando…</p>}>
                <LoginForm />
              </Suspense>
            </div>
            <p className="mt-6 text-center text-sm text-[#64748b]">
              Não tem conta?{" "}
              <Link href="/cadastro" className="font-medium text-accent hover:underline">
                Criar conta
              </Link>
            </p>
            <p className="mt-3 rounded-lg bg-[#f0fdf9] px-3 py-2 text-center text-xs text-[#64748b]">
              Demo: <span className="font-mono text-[#0f172a]">cliente@datageo.com.br</span> /{" "}
              <span className="font-mono text-[#0f172a]">demo123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
