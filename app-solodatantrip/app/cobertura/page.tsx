import Link from "next/link";
import { CoverageMapDynamic } from "@/components/coverage-map-dynamic";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Mapa de cobertura RTK | Datageo Ntrip",
  description:
    "Consulte a cobertura de correção GNSS (2 cm e 10 cm) por região. Dados Geodnet, mesma base do mapa RTK Data.",
};

export default function CoberturaPage() {
  return (
    <>
      <SiteHeader />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              Cobertura GNSS
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Mapa de cobertura RTK
            </h1>
            <p className="mt-3 text-muted">
              Pesquise sua cidade ou clique no mapa para ver a precisão estimada (2 cm ou
              10 cm). Dados fornecidos pela rede{" "}
              <a
                href="https://rtkdata.com/coverage/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                Geodnet / RTK Data
              </a>
              .
            </p>
          </div>
          <CoverageMapDynamic />
          <p className="mt-6 text-center text-sm text-muted">
            <Link href="/#contato" className="text-accent hover:underline">
              Sem cobertura na sua área?
            </Link>{" "}
            — solicite expansão ou avaliação gratuita.
          </p>
        </div>
      </main>
    </>
  );
}
