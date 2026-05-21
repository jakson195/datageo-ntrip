import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { getSession } from "@/lib/auth";

export default async function RedePage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <>
      <DashboardHeader
        user={user}
        title="Estado da rede"
        subtitle="Status operacional do serviço de correção"
      />
      <div className="flex-1 p-4 sm:p-8">
        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            <p className="font-semibold text-[#0f172a]">Rede operacional</p>
          </div>
          <p className="mt-4 text-sm text-[#64748b]">
            Caster NTRIP disponível 24/7. Latência e disponibilidade podem variar conforme
            a região — consulte o mapa de cobertura para detalhes na sua área.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-[#475569]">
            <li>• Servidor: {user.ntrip.server}</li>
            <li>• Porta: {user.ntrip.port}</li>
            <li>• Assinatura: {user.subscription.label}</li>
          </ul>
        </div>
      </div>
    </>
  );
}
