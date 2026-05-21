import { redirect } from "next/navigation";
import { ClientAreaShell } from "@/components/dashboard/client-area-shell";
import { getSession } from "@/lib/auth";

export default async function AreaClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return <ClientAreaShell user={session}>{children}</ClientAreaShell>;
}
