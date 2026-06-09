import Link from "next/link";
import { PageHeading } from "@/components/dashboard/page-heading";

export const metadata = { title: "Comprar assinatura | Datageo Ntrip" };

export default function AssinaturaPage() {
  return (
    <main className="flex-1 bg-[#f3f4f6] p-4 sm:p-8">
      <PageHeading
        title="Comprar assinatura"
        description="Escolha o plano ideal para correção RTK em campo."
      />
      <div className="rounded-xl border border-[#e5e7eb] bg-white p-6">
        <p className="text-sm text-[#6b7280]">
          Veja os planos disponíveis no site e entre em contato para ativar sua conta.
        </p>
        <Link
          href="/#planos"
          className="mt-4 inline-flex rounded-lg btn-brand-primary px-4 py-2.5 text-sm"
        >
          Ver planos no site
        </Link>
      </div>
    </main>
  );
}
