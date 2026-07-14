import { ClientPlaceholderPage } from "@/components/dashboard/client-placeholder-page";

export const metadata = { title: "Uso RTK | Datageo Ntrip" };

export default function UsoPage() {
  return (
    <ClientPlaceholderPage
      title="Uso RTK"
      description="Histórico de conexões e consumo dos fluxos da sua assinatura."
    />
  );
}
