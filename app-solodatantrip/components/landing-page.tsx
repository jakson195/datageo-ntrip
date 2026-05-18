import Link from "next/link";
import { CoverageMapDynamic } from "./coverage-map-dynamic";
import { IndustriesSection } from "./industries-section";
import { ServiceGuideSection } from "./service-guide-section";
import { SiteHeader } from "./site-header";

const stats = [
  { value: "1–2 cm", label: "Precisão RTK" },
  { value: "24/7", label: "Correção NTRIP" },
  { value: "99,9%", label: "Disponibilidade alvo" },
  { value: "48h", label: "Entrega ortomosaico" },
];

const plans = [
  {
    name: "NTRIP Diário",
    price: "R$ 29",
    period: "/dia",
    desc: "Correção em tempo real para drones e receptores compatíveis.",
    features: ["1 usuário simultâneo", "Caster NTRIP", "Suporte por WhatsApp"],
  },
  {
    name: "NTRIP Mensal",
    price: "R$ 199",
    period: "/mês",
    desc: "Uso recorrente em campo com cancelamento flexível.",
    features: ["1 usuário simultâneo", "RTK + PPK (RINEX)", "Prioridade no suporte"],
    highlight: true,
  },
  {
    name: "Drone + NTRIP",
    price: "Sob consulta",
    period: "",
    desc: "Pacote: correção GNSS + processamento de imagens (ortomosaico, DSM, relatório).",
    features: ["Volume de hectares", "Nuvem de pontos opcional", "API para integração"],
  },
];

const faqs = [
  {
    q: "O site substitui o aplicativo de sondagem?",
    a: "Não. Este site é institucional e comercial (NTRIP e processamento de drone). O app de sondagem continua separado, em outra URL/porta.",
  },
  {
    q: "Quais drones são compatíveis com NTRIP?",
    a: "DJI Enterprise (Matrice, Phantom 4 RTK), drones com receptor externo NTRIP e equipamentos de topografia com cliente NTRIP.",
  },
  {
    q: "Como funciona o processamento de imagens?",
    a: "Você envia fotos georreferenciadas (ou contrata captura). Entregamos ortomosaico, modelo digital de superfície e relatório de precisão conforme o plano.",
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
      <main>
        {/* Hero */}
        <section className="hero-glow grid-bg relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="mb-4 inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-accent">
              NTRIP · RTK · Ortomosaicos
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Precisão centimétrica e{" "}
              <span className="text-accent">imagens de drone</span> no mesmo ecossistema
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted">
              Rede de correção GNSS (NTRIP) e processamento fotogramétrico para
              topografia, agronomia e obras — com foco no seu fluxo de trabalho.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="#contato"
                className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-background transition hover:bg-accent-dim"
              >
                Avaliação gratuita 30 dias
              </Link>
              <Link
                href="/processamento"
                className="rounded-full border border-drone/40 bg-drone/10 px-6 py-3 text-sm font-medium text-drone transition hover:bg-drone/20"
              >
                Processamento de drone
              </Link>
              <Link
                href="#planos"
                className="rounded-full border border-card-border px-6 py-3 text-sm font-medium transition hover:border-accent/50"
              >
                Ver planos
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              <li>Até 1–2 cm com RTK</li>
              <li>Compatível com DJI RTK e receptores NTRIP</li>
              <li>Ortomosaico e DSM sob demanda</li>
            </ul>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y border-card-border bg-card/50 py-12">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 sm:grid-cols-4 sm:px-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center sm:text-left">
                <p className="text-2xl font-bold text-accent sm:text-3xl">{s.value}</p>
                <p className="mt-1 text-sm text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        <ServiceGuideSection />

        <IndustriesSection />

        {/* NTRIP */}
        <section id="ntrip" className="scroll-mt-24 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Correção NTRIP / RTK
                </h2>
                <p className="mt-4 text-muted leading-relaxed">
                  Conecte drones, tratores ou receptores GNSS ao nosso caster NTRIP e
                  trabalhe com precisão centimétrica em tempo real — sem instalar base
                  própria em cada obra.
                </p>
                <ul className="mt-8 space-y-3 text-sm">
                  {[
                    "Protocolo NTRIP padrão de mercado",
                    "Suporte multi-constelação (GPS, GLONASS, Galileo, BeiDou)",
                    "Planos diário, semanal e mensal",
                    "Mapa de cobertura interativo",
                  ].map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-0.5 text-accent">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-card-border bg-card p-6 sm:p-8">
                <p className="text-xs font-medium uppercase tracking-wider text-accent">
                  Mapa de cobertura
                </p>
                <CoverageMapDynamic compact />
                <Link
                  href="/cobertura"
                  className="mt-3 inline-block text-sm text-accent hover:underline"
                >
                  Abrir mapa em tela cheia →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Drones */}
        <section id="drones" className="scroll-mt-24 border-t border-card-border bg-card/30 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div className="order-2 lg:order-1 rounded-2xl border border-card-border bg-card p-6 sm:p-8">
                <p className="text-xs font-medium uppercase tracking-wider text-drone">
                  Processamento
                </p>
                <ul className="mt-6 space-y-4 text-sm">
                  {[
                    "Ortomosaico georreferenciado (GeoTIFF)",
                    "Modelo digital de superfície (DSM)",
                    "Nuvem de pontos e relatório de precisão",
                    "Entrega via link seguro ou API",
                  ].map((item) => (
                    <li
                      key={item}
                      className="rounded-lg border border-card-border bg-background/40 px-4 py-3"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="order-1 lg:order-2">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Processamento de imagens de drone
                </h2>
                <p className="mt-4 text-muted leading-relaxed">
                  Do voo ao entregável: alinhamos fotos com GNSS de alta precisão (ideal
                  com nosso NTRIP), geramos ortomosaicos e modelos para topografia,
                  volumetria e acompanhamento de obra.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    href="/processamento"
                    className="inline-flex rounded-full bg-drone px-6 py-3 text-sm font-semibold text-background transition hover:opacity-90"
                  >
                    Enviar imagens agora
                  </Link>
                  <Link
                    href="#contato"
                    className="inline-flex rounded-full border border-drone/40 bg-drone/10 px-6 py-3 text-sm font-medium text-drone transition hover:bg-drone/20"
                  >
                    Solicitar orçamento
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Plans */}
        <section id="planos" className="scroll-mt-24 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-bold sm:text-4xl">Planos flexíveis</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted">
              Preço justo, sem surpresas. Valores de referência — ajuste comercial na
              proposta final.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {plans.map((plan) => (
                <article
                  key={plan.name}
                  className={`flex flex-col rounded-2xl border p-6 text-left ${
                    plan.highlight
                      ? "border-accent bg-accent/5 shadow-[0_0_40px_var(--accent-glow)]"
                      : "border-card-border bg-card"
                  }`}
                >
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="mt-4">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted">{plan.period}</span>
                  </p>
                  <p className="mt-3 text-sm text-muted">{plan.desc}</p>
                  <ul className="mt-6 flex-1 space-y-2 text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className="text-accent">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="#contato"
                    className={`mt-8 block rounded-full py-3 text-center text-sm font-medium transition ${
                      plan.highlight
                        ? "bg-accent text-background hover:bg-accent-dim"
                        : "border border-card-border hover:border-accent/40"
                    }`}
                  >
                    {plan.price === "Sob consulta" ? "Fale conosco" : "Contratar"}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24 border-t border-card-border py-20 sm:py-28">
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
        <section id="contato" className="scroll-mt-24 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/10 to-drone/10 p-8 sm:p-12 text-center">
              <h2 className="text-2xl font-bold sm:text-3xl">
                Comece com avaliação gratuita de 30 dias
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-muted">
                Teste a rede NTRIP na sua região ou peça um orçamento de processamento
                de imagens. Resposta em até 24h úteis.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link
                  href="https://wa.me/5511999999999"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-accent px-8 py-3 text-sm font-semibold text-background hover:bg-accent-dim"
                >
                  WhatsApp
                </Link>
                <Link
                  href="mailto:contato@datageontrip.com.br"
                  className="rounded-full border border-card-border px-8 py-3 text-sm font-medium hover:border-accent/40"
                >
                  contato@datageontrip.com.br
                </Link>
              </div>
              <p className="mt-6 text-xs text-muted">
                App de sondagem: acesse separadamente (porta 3000). Site comercial: porta
                3001 em desenvolvimento.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-card-border py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} Datageo Ntrip. Todos os direitos reservados.</p>
          <nav className="flex gap-6">
            <Link href="#ntrip" className="hover:text-foreground">
              NTRIP
            </Link>
            <Link href="/processamento" className="hover:text-foreground">
              Processamento
            </Link>
            <Link href="#drones" className="hover:text-foreground">
              Drones
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
