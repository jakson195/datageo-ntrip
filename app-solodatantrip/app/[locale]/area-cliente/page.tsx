import { redirect } from "next/navigation";
import { PageHeading } from "@/components/dashboard/page-heading";
import { RtkCredentialsPanel } from "@/components/dashboard/rtk-credentials-panel";
import { SubscriptionCard } from "@/components/dashboard/subscription-card";
import { getSession } from "@/lib/auth";

export const metadata = {
  title: "Painel | Datageo Ntrip",
};

export default async function AreaClienteHomePage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <main className="flex-1 bg-[#f3f4f6] p-4 sm:p-8">
      <PageHeading
        title={`Olá, ${user.name.split(" ")[0]}`}
        description="Visão geral da sua conta RTK e assinatura."
      />
      <div className="space-y-6">
        <RtkCredentialsPanel user={user} />
        <SubscriptionCard subscription={user.subscription} />
      </div>
    </main>
  );
}
