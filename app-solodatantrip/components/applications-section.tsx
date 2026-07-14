import Link from "next/link";
import type { ReactNode } from "react";
import { HardNavLink } from "./hard-nav-link";

type Application = {
  id: string;
  category: string;
  title: string;
  description: string;
  benefits: string[];
  gradient: string;
  pattern: string;
  icon: ReactNode;
};

function IconAgriculture() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 18h16M6 18V9l6-4 6 4v9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 13h6M12 9v9" strokeLinecap="round" />
    </svg>
  );
}

function IconTopography() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function IconConstruction() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 21h18M6 21V9l6-6 6 6v12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 21v-6h4v6" strokeLinecap="round" />
    </svg>
  );
}

function IconGeotechnics() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function IconMining() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 20l4-8 4 4 4-10 4 14H4z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMonitoring() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 14h16M6 14V8h12v6" strokeLinecap="round" />
      <path d="M8 8V5h8v3M10 18h4" strokeLinecap="round" />
      <circle cx="12" cy="11" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconHydrography() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 18c2-2 4-2 6 0s4 2 6 0 4-2 4-2" strokeLinecap="round" />
      <path d="M3 20h18M8 8l4-3 4 3v4H8V8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const applications: Application[] = [
  {
    id: "agricultura",
    category: "Agricultura de Precisão",
    title: "Operação centimétrica em campo",
    description:
      "Forneça correções GNSS RTK para tratores, pulverizadores, plantadeiras e colheitadeiras, permitindo operações automatizadas com alta precisão.",
    benefits: [
      "Redução de sobreposição",
      "Economia de insumos",
      "Maior produtividade",
      "Operação com piloto automático",
      "Precisão centimétrica",
    ],
    gradient: "from-emerald-950 via-[#0a1a12] to-[#061008]",
    pattern: "radial-gradient(circle at 75% 25%, rgba(143,212,0,0.35), transparent 55%)",
    icon: <IconAgriculture />,
  },
  {
    id: "topografia",
    category: "Topografia e Georreferenciamento",
    title: "Levantamentos RTK em tempo real",
    description: "Realize levantamentos de alta precisão sem necessidade de base própria.",
    benefits: [
      "Georreferenciamento",
      "Cadastro técnico",
      "Locações",
      "Aerolevantamentos RTK",
      "Precisão centimétrica",
    ],
    gradient: "from-slate-800 via-slate-900 to-[#0a1628]",
    pattern: "radial-gradient(circle at 20% 70%, rgba(0,200,240,0.35), transparent 50%)",
    icon: <IconTopography />,
  },
  {
    id: "construcao",
    category: "Construção Civil",
    title: "Controle e implantação de obras",
    description:
      "Locação de estruturas, terraplenagem e controle de execução utilizando GNSS RTK.",
    benefits: [
      "Menos retrabalho",
      "Maior produtividade",
      "Controle de terraplenagem",
      "Precisão na implantação",
    ],
    gradient: "from-amber-950/90 via-[#1a1408] to-background",
    pattern: "radial-gradient(circle at 65% 40%, rgba(255,180,60,0.25), transparent 50%)",
    icon: <IconConstruction />,
  },
  {
    id: "geotecnia",
    category: "Geotecnia e Sondagens",
    title: "Posicionamento preciso de investigações",
    description:
      "Controle de localização de sondagens SPT, rotativas e poços de monitoramento.",
    benefits: [
      "Rastreabilidade",
      "Integração com geologia",
      "Controle de campanhas",
      "Posicionamento preciso",
    ],
    gradient: "from-[#1a1208] via-[#120c06] to-background",
    pattern: "radial-gradient(circle at 30% 30%, rgba(180,120,60,0.3), transparent 55%)",
    icon: <IconGeotechnics />,
  },
  {
    id: "mineracao",
    category: "Mineração",
    title: "Controle operacional de mina",
    description:
      "Locação de furos de desmonte, monitoramento de cava e controle topográfico.",
    benefits: [
      "Controle de produção",
      "Locação de perfurações",
      "Gestão de barragens",
      "Atualização de modelos digitais",
    ],
    gradient: "from-zinc-900 via-[#141210] to-background",
    pattern: "radial-gradient(circle at 80% 60%, rgba(160,160,160,0.25), transparent 50%)",
    icon: <IconMining />,
  },
  {
    id: "monitoramento",
    category: "Monitoramento Estrutural",
    title: "Monitoramento GNSS em tempo real",
    description: "Acompanhamento contínuo de deslocamentos em estruturas críticas.",
    benefits: [
      "Alertas automáticos",
      "Histórico de deslocamentos",
      "Monitoramento remoto",
      "Segurança operacional",
    ],
    gradient: "from-[#0a1830] via-slate-900 to-background",
    pattern: "radial-gradient(circle at 40% 20%, rgba(59,158,255,0.35), transparent 55%)",
    icon: <IconMonitoring />,
  },
  {
    id: "hidrografia",
    category: "Hidrografia e Aplicações Marinhas",
    title: "Navegação e levantamentos hidrográficos",
    description: "Correções GNSS para embarcações, batimetria e dragagens.",
    benefits: [
      "Navegação segura",
      "Batimetria precisa",
      "Controle de dragagem",
      "Obras marítimas",
    ],
    gradient: "from-[#061828] via-[#0a2040] to-background",
    pattern: "radial-gradient(circle at 50% 80%, rgba(0,200,240,0.3), transparent 50%)",
    icon: <IconHydrography />,
  },
];

export function ApplicationsSection() {
  return (
    <section
      id="aplicacoes"
      className="scroll-mt-32 py-20 sm:py-28"
      aria-labelledby="aplicacoes-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-geo">
            Aplicações
          </p>
          <h2
            id="aplicacoes-heading"
            className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.5rem]"
          >
            Correções GNSS RTK para cada segmento profissional
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            O DataGeo NTRIP posiciona sua operação como plataforma profissional de correções
            em tempo real — da lavoura à mina, da obra ao monitoramento estrutural.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {applications.map((app) => (
            <article
              key={app.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-card-border bg-card/60 transition hover:border-brand-geo/35 hover:shadow-[0_16px_48px_rgba(0,200,240,0.1)]"
            >
              <div
                className={`relative h-44 overflow-hidden bg-gradient-to-br ${app.gradient}`}
                role="img"
                aria-label={`Ilustração: ${app.category}`}
              >
                <div
                  className="absolute inset-0 opacity-90"
                  style={{ background: app.pattern }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                <div className="absolute left-5 top-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-black/30 text-brand-geo backdrop-blur-sm">
                  {app.icon}
                </div>
                <div className="absolute bottom-4 left-5 right-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand-ntrip/90">
                    {app.category}
                  </p>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                  {app.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{app.description}</p>

                <ul className="mt-5 space-y-2.5 border-t border-card-border/80 pt-5">
                  {app.benefits.map((benefit) => (
                    <li key={benefit} className="flex gap-2.5 text-sm text-foreground/90">
                      <span
                        className="mt-0.5 shrink-0 text-brand-ntrip"
                        aria-hidden
                      >
                        ✓
                      </span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <HardNavLink
            href="/cadastro"
            className="rounded-full btn-brand-primary px-8 py-3.5 text-sm font-semibold sm:text-base"
          >
            Trial grátis 30 dias
          </HardNavLink>
          <Link
            href="/cobertura"
            className="text-sm font-medium text-brand-geo underline-offset-4 hover:underline"
          >
            Ver cobertura na sua região →
          </Link>
        </div>
      </div>
    </section>
  );
}
