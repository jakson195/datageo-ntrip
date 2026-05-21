import Link from "next/link";
import { RegisterForm } from "@/components/register-form";

export const metadata = {
  title: "Cadastro | Datageo Ntrip",
  description: "Crie sua conta e acesse suas credenciais RTK.",
};

export default function CadastroPage() {
  return (
    <div className="min-h-screen bg-[#eef2f6]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-12 sm:px-6">
        <div className="mx-auto w-full max-w-md">
          <Link
            href="/"
            className="mb-8 flex items-center justify-center gap-2 font-semibold text-[#0f172a]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-sm text-white">
              DG
            </span>
            <span>
              Datageo <span className="text-accent">Ntrip</span>
            </span>
          </Link>

          <div className="rounded-2xl border border-[#d8e0eb] bg-white p-8 shadow-[0_8px_40px_rgba(15,23,42,0.08)]">
            <h1 className="text-center text-2xl font-bold text-[#0f172a]">Criar conta</h1>
            <p className="mt-2 text-center text-sm text-[#64748b]">
              Cadastre-se para acessar suas credenciais RTK e dados da assinatura.
            </p>
            <div className="mt-8">
              <RegisterForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
