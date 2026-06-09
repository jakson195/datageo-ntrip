import { redirect } from "next/navigation";
import { PageHeading } from "@/components/dashboard/page-heading";
import { RtkCredentialsPanel } from "@/components/dashboard/rtk-credentials-panel";
import { getSession } from "@/lib/auth";
import { findStoredUserById, userDtoToDashboardSession } from "@/lib/users-store";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata = {
  title: "Credenciais RTK | Datageo Ntrip",
};

export default async function CredenciaisPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const stored = await findStoredUserById(session.id);
  const user = stored ? userDtoToDashboardSession(stored) : session;

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
