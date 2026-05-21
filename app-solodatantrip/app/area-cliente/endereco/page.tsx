import { ClientPlaceholderPage } from "@/components/dashboard/client-placeholder-page";

export const metadata = { title: "Editar endereço | Datageo Ntrip" };

export default function EnderecoPage() {
  return (
    <ClientPlaceholderPage
      title="Editar endereço"
      description="Atualize endereço de faturamento e correspondência."
    />
  );
}
