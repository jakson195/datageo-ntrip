import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { getSession } from "@/lib/auth";

export default async function PlanosClientePage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <>
      <DashboardHeader
        user={user}
        title="Planos"
        subtitle="Conheça opções de assinatura NTRIP"
      />
      <div className="flex-1 p-4 sm:p-8">
        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#64748b]">
            Plano atual: <strong className="text-[#0f172a]">{user.subscription.label}</strong>
          </p>
          <Link
            href="/#planos"
            className="mt-4 inline-flex rounded-xl btn-brand-primary px-5 py-2.5 text-sm"
          >
            Ver planos no site
          </Link>
        </div>
      </div>
    </>
  );
}
