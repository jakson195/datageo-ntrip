import Link from "next/link";
import type { ReactNode } from "react";

type GuideBlock = {
  id: string;
  title: string;
  subtitle: string;
  accent: "accent" | "drone";
  icon: ReactNode;
  items: { label: string; text: string }[];
};

const blocks: GuideBlock[] = [
  {
    id: "fluxo",
    title: "Do cadastro ao fix RTK",
    subtitle: "Fluxo em 4 etapas — da ativação ao trabalho em campo",
    accent: "accent",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 12h4l2-4 4 8 2-4h4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    items: [
      {
        label: "01",
        text: "Ative o acesso NTRIP e configure caster, mountpoint e credenciais no rover ou app do drone.",
      },
      {
        label: "02",
        text: "Execute o voo ou a coleta com fix RTK ativo; exporte as fotos com metadados GNSS quando possível.",
      },
      {
        label: "03",
        text: "Conecte o rover ou o drone ao caster NTRIP e aguarde o fix RTK antes de iniciar a coleta.",
      },
      {
        label: "04",
        text: "Trabalhe com precisão centimétrica; exporte pontos e linhas para CAD/GIS ou grave logs para PPK.",
      },
    ],
  },
  {
    id: "pacote",
    title: "O que você recebe",
    subtitle: "Serviços digitais incluídos na plataforma Datageo Ntrip",
    accent: "drone",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
        <path d="M4.9 4.9l2.1 2.1M16.9 16.9l2.1 2.1M4.9 19.1l2.1-2.1M16.9 7.1l2.1-2.1" strokeLinecap="round" />
      </svg>
    ),
    items: [
      {
        label: "RTK",
        text: "Caster NTRIP com correções RTCM 3.x e suporte a múltiplas constelações GNSS.",
      },
      {
        label: "Web",
        text: "Credenciais, mountpoint e status da conexão em um painel simples.",
      },
      {
        label: "Geo",
        text: "Referência SIRGAS2000 e orientação para grids locais (mediante plano).",
      },
      {
        label: "Dados",
        text: "RINEX sob demanda para auditoria ou PPK quando contratado.",
      },
      {
        label: "Suporte",
        text: "Atendimento por WhatsApp com especialistas em campo e drone.",
      },
    ],
  },
  {
    id: "checklist",
    title: "Checklist antes de começar",
    subtitle: "Evite retrabalho no campo",
    accent: "accent",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    items: [
      {
        label: "HW",
        text: "Receptor multibanda com cliente NTRIP ou drone RTK com link de dados estável (4G/5G).",
      },
      {
        label: "Céu",
        text: "Horizonte desobstruído, antena nivelada e altura de bastão calibrada no software.",
      },
      {
        label: "Foto",
        text: "Sobreposição frontal/lateral adequada, foco nítido e sem motion blur excessivo.",
      },
      {
        label: "Rede",
        text: "Internet para RTK em tempo real; sem cobertura, grave logs para PPK posterior.",
      },
    ],
  },
];

function accentClass(accent: GuideBlock["accent"]) {
  return accent === "drone"
    ? "border-drone text-drone bg-drone/10"
    : "border-accent text-accent bg-accent/10";
}

export function ServiceGuideSection() {
  return (
    <section
      id="como-funciona"
      className="scroll-mt-24 border-y border-card-border bg-[#0a0e14] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Guia do serviço
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            NTRIP e drone, explicados de forma direta
          </h2>
          <p className="mt-3 text-muted">
            Estrutura pensada para quem precisa corrigir posição e processar imagens — sem
            depender só de manuais genéricos de rede RTK.
          </p>
        </div>

        <div className="mt-12 space-y-6">
          {blocks.map((block, index) => (
            <article
              key={block.id}
              className={`flex flex-col overflow-hidden rounded-2xl border border-card-border bg-card/80 ${
                index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
              }`}
            >
              <div
                className={`flex shrink-0 flex-col justify-center border-b border-card-border px-6 py-8 lg:w-72 lg:border-b-0 ${
                  index % 2 === 1
                    ? "lg:border-l lg:border-card-border lg:bg-drone/5"
                    : "lg:border-r lg:border-card-border lg:bg-accent/5"
                }`}
              >
                <div
                  className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border ${accentClass(block.accent)}`}
                >
                  {block.icon}
                </div>
                <h3 className="text-xl font-semibold">{block.title}</h3>
                <p className="mt-2 text-sm text-muted">{block.subtitle}</p>
              </div>

              <ul className="flex flex-1 flex-col justify-center divide-y divide-card-border/80 px-6 py-2 sm:px-8">
                {block.items.map((item) => (
                  <li key={item.label} className="flex gap-4 py-4">
                    <span
                      className={`mt-0.5 flex h-8 min-w-8 items-center justify-center rounded-md text-xs font-bold ${accentClass(block.accent)}`}
                    >
                      {item.label}
                    </span>
                    <p className="text-sm leading-relaxed text-foreground/90">{item.text}</p>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/cobertura"
            className="rounded-full bg-drone px-6 py-3 text-sm font-semibold text-background transition hover:opacity-90"
          >
            Ver mapa de cobertura
          </Link>
          <Link
            href="#contato"
            className="rounded-full border border-card-border px-6 py-3 text-sm font-medium transition hover:border-accent/50"
          >
            Falar com especialista
          </Link>
        </div>
      </div>
    </section>
  );
}
