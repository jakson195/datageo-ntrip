import Link from "next/link";
import { CoverageMapViewport } from "./coverage-map-viewport";
import { HardNavLink } from "./hard-nav-link";
import { HeroSection } from "./hero-section";
import { IndustriesSection } from "./industries-section";
import { ServiceGuideSection } from "./service-guide-section";
import { SiteHeader } from "./site-header";

const plans = [
  {
    name: "Trial",
    price: "Grátis",
    period: " · 30 dias",
    desc: "Experimente a rede NTRIP na sua região com a sua equipa.",
    features: [
      "1 usuário simultâneo",
      "Caster NTRIP",
      "Suporte por e-mail",
      "Sem cartão de crédito",
    ],
    cta: "Começar grátis",
    href: "/cadastro",
  },
  {
    name: "Pro",
    price: "R$ 199",
    period: " / mês",
    desc: "Para equipas de campo e consultorias em crescimento.",
    features: [
      "RTK + PPK (RINEX)",
      "Mapa de cobertura",
      "Painel do cliente",
      "Prioridade no suporte",
    ],
    highlight: true,
    badge: "Mais popular",
    cta: "Assinar Pro",
    href: "#contato",
  },
  {
    name: "Enterprise",
    price: "Sob consulta",
    period: " · contrato anual",
    desc: "Grandes volumes, SLA e mountpoints dedicados sob medida.",
    features: [
      "Vários acessos simultâneos",
      "Integração via API",
      "Suporte prioritário",
      "Gestor de conta dedicado",
    ],
    cta: "Falar com vendas",
    href: "#contato",
  },
];

const faqs = [
  {
    q: "Quais drones são compatíveis com NTRIP?",
    a: "DJI Enterprise (Matrice, Phantom 4 RTK), drones com receptor externo NTRIP e equipamentos de topografia com cliente NTRIP.",
  },
  {
    q: "Qual precisão consigo em tempo real?",
    a: "Com fix RTK e boa cobertura de rede, é comum atingir 1–2 cm horizontais. A precisão depende do receptor, do ambiente e da qualidade do sinal.",
  },
  {
    q: "Preciso de internet no campo?",
    a: "Sim, para RTK em tempo real via NTRIP. Sem sinal, é possível gravar dados para PPK posterior.",
  },
];

export function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main className="grid-bg">
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
                  Caster NTRIP com credenciais no painel, mapa de cobertura interactivo e
                  suporte para drones, máquinas e receptores GNSS em tempo real.
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

        {/* Plans */}
        <section id="planos" className="scroll-mt-32 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-bold sm:text-4xl">Planos flexíveis</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted">
              Trial sem cartão, Pro para equipas em crescimento, Enterprise sob medida.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {plans.map((plan) => (
                <article
                  key={plan.name}
                  className={`relative flex flex-col rounded-2xl border p-6 text-left ${
                    plan.highlight
                      ? "border-brand-geo bg-brand-geo/5 shadow-[0_0_40px_var(--accent-glow)]"
                      : "border-card-border bg-card"
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full brand-gradient-bg px-3 py-0.5 text-[11px] font-semibold text-[#030508]">
                      {plan.badge}
                    </span>
                  )}
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-3">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted">{plan.period}</span>
                  </p>
                  <p className="mt-3 text-sm text-muted">{plan.desc}</p>
                  <ul className="mt-6 flex-1 space-y-2 text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className="text-brand-ntrip">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <HardNavLink
                    href={plan.href}
                    className={`mt-8 block rounded-full py-3 text-center text-sm font-medium transition ${
                      plan.highlight ? "btn-brand-primary" : "btn-brand-outline"
                    }`}
                  >
                    {plan.cta}
                  </HardNavLink>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-32 border-t border-card-border py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-bold">Perguntas frequentes</h2>
            <dl className="mt-12 space-y-6">
              {faqs.map((item) => (
                <div
                  key={item.q}
                  className="rounded-xl border border-card-border bg-card p-6"
                >
                  <dt className="font-semibold">{item.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted">{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Contact */}
        <section id="contato" className="scroll-mt-32 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="rounded-3xl border border-brand-geo/30 bg-gradient-to-br from-brand-geo/10 via-brand-data/10 to-brand-ntrip/10 p-8 sm:p-12 text-center">
              <h2 className="text-2xl font-bold sm:text-3xl">
                Comece com trial grátis de 30 dias
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-muted">
                Crie a conta, teste o caster NTRIP na sua região e aceda às credenciais no
                painel. Sem cartão de crédito no trial.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <HardNavLink href="/cadastro" className="rounded-full btn-brand-primary px-8 py-3 text-sm">
                  Criar conta grátis
                </HardNavLink>
                <Link
                  href="mailto:contato@datageontrip.com.br"
                  className="rounded-full btn-brand-outline px-8 py-3 text-sm font-medium"
                >
                  contato@datageontrip.com.br
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
