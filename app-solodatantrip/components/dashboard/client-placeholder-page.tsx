import Link from "next/link";
import { PageHeading } from "./page-heading";

export function ClientPlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="flex-1 bg-[#f3f4f6] p-4 sm:p-8">
      <PageHeading title={title} description={description} />
      <div className="rounded-xl border border-[#e5e7eb] bg-white p-6 text-sm text-[#6b7280]">
        <p>Esta seção estará disponível em breve.</p>
        <p className="mt-4">
          <Link href="/area-cliente/credenciais" className="font-medium text-[#1d6ecf] hover:underline">
            Ver credenciais RTK
          </Link>
          {" · "}
          <Link href="/#contato" className="font-medium text-[#1d6ecf] hover:underline">
            Falar com suporte
          </Link>
        </p>
      </div>
    </main>
  );
}
