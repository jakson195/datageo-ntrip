import { redirect } from "next/navigation";
import { PageHeading } from "@/components/dashboard/page-heading";
import { SubscriptionWorkspace } from "@/components/dashboard/subscription-workspace";
import { getSession } from "@/lib/auth";

export default async function PlanosClientePage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <main className="flex-1 bg-[#f3f4f6] p-4 sm:p-8">
      <PageHeading
        title="Planos"
        description="Escolha mensal, trimestral ou anual e ative correções RTK."
      />
      <SubscriptionWorkspace />
    </main>
  );
}
