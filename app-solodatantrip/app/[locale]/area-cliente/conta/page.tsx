import Link from "next/link";
import { redirect } from "next/navigation";
import { ChangeAccountPasswordForm } from "@/components/dashboard/change-account-password-form";
import { PageHeading } from "@/components/dashboard/page-heading";
import { getSession } from "@/lib/auth";

export const metadata = { title: "Detalhes da conta | Datageo Ntrip" };

export default async function ContaPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <main className="flex-1 bg-[#f3f4f6] p-4 sm:p-8">
      <PageHeading
        title="Detalhes da conta"
        description="Dados do seu cadastro na Datageo Ntrip."
      />

      <div className="grid max-w-2xl gap-6">
        <dl className="space-y-4 rounded-xl border border-[#e5e7eb] bg-white p-6">
          <div>
            <dt className="text-xs font-semibold uppercase text-[#6b7280]">Nome</dt>
            <dd className="mt-1 text-[#111827]">{user.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-[#6b7280]">E-mail</dt>
            <dd className="mt-1 text-[#111827]">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-[#6b7280]">Assinatura</dt>
            <dd className="mt-1 text-[#111827]">{user.subscription.label}</dd>
          </div>
        </dl>

        <section className="rounded-xl border border-[#e5e7eb] bg-white p-6">
          <h2 className="text-lg font-bold text-[#111827]">Senha da conta</h2>
          <p className="mt-1 text-sm text-[#6b7280]">
            Altere a senha usada para entrar na área do cliente (login com e-mail).
          </p>
          <ChangeAccountPasswordForm />
          <p className="mt-4 text-xs text-[#6b7280]">
            Esqueceu a senha?{" "}
            <Link href="/recuperar-senha" className="font-medium text-[#1d6ecf] hover:underline">
              Recuperar senha por e-mail
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
