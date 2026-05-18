import type { Metadata } from "next";
import Link from "next/link";
import { ProcessamentoForm } from "@/components/processamento-form";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Processamento de drone | Datageo Ntrip",
  description:
    "Envie imagens de drone (JPG, PNG, TIFF) e gere pré-visualização e pacote de resultados.",
};

export default function ProcessamentoPage() {
  return (
    <>
      <SiteHeader variant="processamento" />
      <main className="grid-bg hero-glow min-h-screen pt-24 pb-20">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <p className="mb-3 inline-flex rounded-full border border-drone/30 bg-drone/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-drone">
            Processamento de drone
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Envie suas <span className="text-accent">imagens</span>
          </h1>
          <p className="mt-4 text-muted leading-relaxed">
            Faça upload das fotos do voo, informe um nome de projeto (opcional) e
            inicie o processamento. Você receberá uma pré-visualização em mosaico e um
            ZIP para download.
          </p>
          <div className="mt-10 rounded-2xl border border-card-border bg-card/80 p-6 sm:p-8 backdrop-blur-sm">
            <ProcessamentoForm />
          </div>
          <p className="mt-8 text-center text-sm text-muted">
            Dúvidas comerciais?{" "}
            <Link href="/#contato" className="text-accent hover:underline">
              Fale conosco
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
