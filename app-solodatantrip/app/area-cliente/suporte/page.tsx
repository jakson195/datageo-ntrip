import Link from "next/link";
import { PageHeading } from "@/components/dashboard/page-heading";

export const metadata = { title: "Suporte | Datageo Ntrip" };

export default function SuportePage() {
  return (
    <main className="flex-1 bg-[#f3f4f6] p-4 sm:p-8">
      <PageHeading
        title="Suporte"
        description="Tire dúvidas sobre credenciais RTK, configuração do rover ou assinatura."
      />
      <div className="space-y-4 rounded-xl border border-[#e5e7eb] bg-white p-6 text-sm text-[#374151]">
        <p>
          WhatsApp:{" "}
          <a
            href="https://wa.me/5511999999999"
            className="font-medium text-brand-geo hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            (11) 99999-9999
          </a>
        </p>
        <p>
          <Link href="/#contato" className="font-medium text-brand-geo hover:underline">
            Formulário de contato no site
          </Link>
        </p>
      </div>
    </main>
  );
}
