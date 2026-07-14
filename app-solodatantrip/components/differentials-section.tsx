import Link from "next/link";
import type { ReactNode } from "react";

type Differential = {
  id: string;
  title: string;
  description: string;
  accent: "geo" | "ntrip" | "data";
  icon: ReactNode;
};

function IconAudit() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 11l2 2 4-4M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconIntegration() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 12h8M12 8v8" strokeLinecap="round" />
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <path d="M10 7h4v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconValidation() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconQuality() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 19V5M4 19h16M8 15l3-4 3 2 4-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconTeams() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="10" r="2.5" />
      <path d="M3 19c0-2.5 2.5-4 6-4s6 1.5 6 4" strokeLinecap="round" />
      <path d="M17 14c2.5 0 4 1.2 4 3" strokeLinecap="round" />
    </svg>
  );
}

function IconReports() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M7 3h7l3 3v15H7V3z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 3v4h4M9 12h6M9 16h4" strokeLinecap="round" />
    </svg>
  );
}

function IconCoverage() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" strokeLinecap="round" />
    </svg>
  );
}

const accentStyles = {
  geo: "border-brand-geo/30 bg-brand-geo/10 text-brand-geo",
  ntrip: "border-brand-ntrip/30 bg-brand-ntrip/10 text-brand-ntrip",
  data: "border-brand-data/40 bg-brand-data/15 text-[#6eb5ff]",
} as const;

const differentials: Differential[] = [
  {
    id: "auditoria",
    title: "Auditoria Automática RTK",
    description:
      "Análise automática de FIX, FLOAT, PDOP e qualidade do levantamento.",
    accent: "geo",
    icon: <IconAudit />,
  },
  {
    id: "integracao",
    title: "Integração com DataGeoDigital",
    description: "Fluxo completo de campo ao relatório.",
    accent: "ntrip",
    icon: <IconIntegration />,
  },
  {
    id: "validacao",
    title: "Validação RTK x PPP",
    description: "Comparação automática entre coordenadas RTK e pós-processadas.",
    accent: "geo",
    icon: <IconValidation />,
  },
  {
    id: "qualidade",
    title: "Controle de Qualidade por Obra",
    description: "Indicadores técnicos para cada projeto.",
    accent: "data",
    icon: <IconQuality />,
  },
  {
    id: "equipes",
    title: "Gestão de Equipes de Campo",
    description: "Controle de usuários, equipamentos e levantamentos.",
    accent: "ntrip",
    icon: <IconTeams />,
  },
  {
    id: "relatorios",
    title: "Relatórios Técnicos Automáticos",
    description: "Geração de PDF com indicadores de precisão.",
    accent: "geo",
    icon: <IconReports />,
  },
  {
    id: "cobertura",
    title: "Cobertura e Desempenho",
    description: "Mapa de disponibilidade, latência e desempenho da rede.",
    accent: "data",
    icon: <IconCoverage />,
  },
];

export function DifferentialsSection() {
  return (
    <section
      id="diferenciais"
      className="scroll-mt-32 border-y border-card-border bg-[#0a0e14] py-20 sm:py-28"
      aria-labelledby="diferenciais-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-ntrip">
            Diferenciais
          </p>
          <h2
            id="diferenciais-heading"
            className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.5rem]"
          >
            Diferenciais DataGeo NTRIP
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            Tecnologia, controle de qualidade e integração com o ecossistema DataGeo — do fix
            RTK em campo ao relatório técnico entregue ao cliente.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {differentials.map((item, index) => (
            <article
              key={item.id}
              className={`group relative overflow-hidden rounded-2xl border border-card-border bg-card/70 p-6 transition hover:border-white/15 hover:bg-card ${
                index === differentials.length - 1 ? "sm:col-span-2 lg:col-span-1 xl:col-span-1" : ""
              }`}
            >
              <div
                className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl border ${accentStyles[item.accent]}`}
              >
                {item.icon}
              </div>
              <h3 className="text-lg font-semibold tracking-tight">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
              <div
                className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-0 blur-2xl transition group-hover:opacity-100"
                style={{
                  background:
                    item.accent === "geo"
                      ? "rgba(0,200,240,0.15)"
                      : item.accent === "ntrip"
                        ? "rgba(143,212,0,0.12)"
                        : "rgba(26,77,140,0.2)",
                }}
                aria-hidden
              />
            </article>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/cadastro"
            className="rounded-full btn-brand-primary px-8 py-3.5 text-sm font-semibold"
          >
            Começar trial grátis
          </Link>
          <Link
            href="#contato"
            className="rounded-full btn-brand-outline px-8 py-3.5 text-sm font-medium"
          >
            Falar com especialista
          </Link>
        </div>
      </div>
    </section>
  );
}
