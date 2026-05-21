import { ClientPlaceholderPage } from "@/components/dashboard/client-placeholder-page";

export const metadata = { title: "Seus pedidos | Datageo Ntrip" };

export default function PedidosPage() {
  return (
    <ClientPlaceholderPage
      title="Seus pedidos"
      description="Acompanhe compras e renovações da assinatura RTK."
    />
  );
}
