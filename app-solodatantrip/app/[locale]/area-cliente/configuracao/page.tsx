import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { NtripCredentialsCard } from "@/components/dashboard/ntrip-credentials-card";
import { getSession } from "@/lib/auth";

export default async function ConfiguracaoPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <>
      <DashboardHeader
        user={user}
        title="Configuração RTK"
        subtitle="Dados para conectar seu equipamento ao caster NTRIP"
      />
      <div className="flex-1 p-4 sm:p-8">
        <NtripCredentialsCard ntrip={user.ntrip} />
        <p className="mt-6 max-w-2xl text-sm text-[#64748b]">
          Configure o cliente NTRIP no drone ou receptor com servidor, porta, mountpoint,
          usuário e senha acima. Em caso de dúvida, fale com o suporte pelo WhatsApp.
        </p>
      </div>
    </>
  );
}
