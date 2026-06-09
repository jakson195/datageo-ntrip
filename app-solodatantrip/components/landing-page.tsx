import Link from "next/link";
import { CoverageMapViewport } from "./coverage-map-viewport";
import { HeroSection } from "./hero-section";
import { IndustriesSection } from "./industries-section";
import { ServiceGuideSection } from "./service-guide-section";
import { SiteHeader } from "./site-header";

export function LandingPage() {
  return (
    <>
      <SiteHeader />

      <main className="grid-bg">
        <div
          style={{
            background: "red",
            color: "white",
            fontSize: "60px",
            fontWeight: "bold",
            padding: "20px",
            textAlign: "center",
            position: "relative",
            zIndex: 9999,
          }}
        >
          VERSAO NOVA TESTE 23:40
        </div>

        <HeroSection />

        <ServiceGuideSection />

        <IndustriesSection />

        {/* Módulos / NTRIP */}
        <section id="ntrip" className="scroll-mt-32 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-geo">
                Módulos activos
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Rede NTRIP + dashboard
              </h2>
            </div>

            <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:items-start">
              <div>
                <p className="text-muted leading-relaxed">
                  Caster NTRIP com credenciais no painel, mapa de cobertura
                  interactivo e suporte para drones, máquinas e receptores GNSS
                  em tempo real.
                </p>

                <ul className="mt-8 space-y-3 text-sm">
                  {[
                    "Protocolo NTRIP padrão de mercado",
                    "Suporte multi-constelação (GPS, GLONASS, Galileo, BeiDou)",
                    "Planos diário, semanal e mensal",
                    "Mapa de cobertura interativo",
                  ].map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-0.5 text-brand-ntrip">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-card-border bg-card p-6 sm:p-8">
                <p className="text-xs font-medium uppercase tracking-wider text-brand-geo">
                  Mapa de cobertura
                </p>

                <CoverageMapViewport compact />

                <Link
                  href="/cobertura"
                  className="mt-3 inline-block text-sm text-brand-geo hover:underline"
                >
                  Abrir mapa em tela cheia →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-card-border bg-card/30 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 text-sm text-muted sm:flex-row sm:px-6">
          <p>
            © {new Date().getFullYear()}{" "}
            <span className="brand-wordmark">
              <span className="brand-data">Data</span>
              <span className="brand-geo">Geo</span>{" "}
              <span className="brand-ntrip">NTrip</span>
            </span>
            . Todos os direitos reservados.
          </p>

          <nav className="flex gap-6">
            <Link href="#ntrip" className="hover:text-foreground">
              NTRIP
            </Link>

            <Link href="/cobertura" className="hover:text-foreground">
              Cobertura
            </Link>

            <Link href="#contato" className="hover:text-foreground">
              Contato
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
