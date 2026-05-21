import { redirect } from "next/navigation";
import { PageHeading } from "@/components/dashboard/page-heading";
import { RtkCredentialsPanel } from "@/components/dashboard/rtk-credentials-panel";
import { getSession } from "@/lib/auth";

export const metadata = {
  title: "Credenciais RTK | Datageo Ntrip",
};

export default async function CredenciaisPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <main className="flex-1 bg-[#f3f4f6] p-4 sm:p-8">
      <PageHeading
        title="Credenciais RTK"
        description="Copie usuário, senha e configuração do servidor para o seu equipamento."
      />
      <RtkCredentialsPanel user={user} />
    </main>
  );
}
