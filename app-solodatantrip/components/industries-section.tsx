import Link from "next/link";
import { HardNavLink } from "./hard-nav-link";

type Sector = {
  id: string;
  title: string;
  headline: string;
  body: string;
  tags: string[];
  gradient: string;
  pattern: string;
};

const sectors: Sector[] = [
  {
    id: "topografia",
    title: "Topografia",
    headline: "Levantamentos sem retrabalho em campo",
    body: "Estações totais e GNSS com NTRIP para pontos, linhas e superfícies com fix confiável. Exporte para CAD/GIS sem perder tempo com base própria em cada frente.",
    tags: ["NTRIP", "PPK"],
    gradient: "from-slate-800 via-slate-900 to-[#0a1628]",
    pattern: "radial-gradient(circle at 80% 20%, rgba(0,200,240,0.35), transparent 50%)",
  },
  {
    id: "agronomia",
    title: "Agronomia",
    headline: "Plantio e pulverização no traço certo",
    body: "Tratores com GPS/RTK e voos de drone com fix em tempo real. Correção NTRIP na lavoura para plantio, pulverização e manejo preciso.",
    tags: ["NTRIP", "Drone"],
    gradient: "from-emerald-950 via-[#0a1a12] to-background",
    pattern: "radial-gradient(circle at 20% 80%, rgba(143,212,0,0.28), transparent 45%)",
  },
  {
    id: "obras",
    title: "Obras e infraestrutura",
    headline: "Máquinas e medições no projeto, não no chute",
    body: "Escavadeiras, motoniveladoras e máquinas com posição centimétrica. Acompanhamento de obra e volumetria com GNSS corrigido.",
    tags: ["NTRIP", "Volumetria"],
    gradient: "from-amber-950/80 via-[#1a1408] to-background",
    pattern: "radial-gradient(circle at 70% 60%, rgba(26,77,140,0.35), transparent 50%)",
  },
  {
    id: "drone",
    title: "Mapeamento com drone",
    headline: "Voos com fix RTK no ar",
    body: "Matrice, Phantom RTK e payloads LiDAR com correção NTRIP em tempo real. Ideal para inspeções, cadastro e levantamentos sem base local.",
    tags: ["Drone", "RTK"],
    gradient: "from-[#0a1830] via-slate-900 to-background",
    pattern: "radial-gradient(circle at 30% 30%, rgba(0,200,240,0.35), transparent 55%)",
  },
];

function TagBadge({ label }: { label: string }) {
  return (
    <span className="rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/90">
      {label}
    </span>
  );
}

export function IndustriesSection() {
  return (
    <section id="setores" className="scroll-mt-32 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-data">
              Aplicações
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Onde a correção NTRIP faz diferença
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted">
            Cada setor usa correção GNSS, drone ou os dois. Escolha o que combina com
            sua operação — sem pacote genérico único.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {sectors.map((sector) => (
            <article
              key={sector.id}
              className={`group relative min-h-[280px] overflow-hidden rounded-2xl border border-card-border bg-gradient-to-br ${sector.gradient} transition hover:border-brand-geo/30 hover:shadow-[0_12px_40px_rgba(0,200,240,0.12)]`}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-80"
                style={{ background: sector.pattern }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

              <div className="relative flex h-full flex-col justify-between p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-lg font-bold text-white/95">{sector.title}</span>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {sector.tags.map((tag) => (
                      <TagBadge key={tag} label={tag} />
                    ))}
                  </div>
                </div>

                <div className="mt-auto">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition group-hover:border-brand-geo/25 group-hover:bg-white/10">
                    <p className="text-sm font-semibold text-brand-geo">{sector.headline}</p>
                    <p className="mt-2 text-sm leading-relaxed text-white/75">
                      {sector.body}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <HardNavLink
            href="/cadastro"
            className="rounded-full btn-brand-primary px-8 py-3 text-sm"
          >
            Trial grátis 30 dias
          </HardNavLink>
          <Link
            href="/#ntrip"
            className="text-sm font-medium text-brand-geo underline-offset-4 hover:underline"
          >
            Ver módulos em detalhe →
          </Link>
        </div>
      </div>
    </section>
  );
}
