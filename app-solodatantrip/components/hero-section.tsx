import Link from "next/link";
import { HeroVideoBackground } from "./hero-video-background";

const highlights = [
  { value: "1–2 cm", label: "Precisão RTK" },
  { value: "24/7", label: "Correção NTRIP" },
  { value: "BR", label: "Cobertura nacional" },
  { value: "PPK", label: "RINEX sob demanda" },
];

export function HeroSection() {
  return (
    <section className="relative min-h-[min(88vh,860px)] overflow-hidden pt-24 sm:pt-28">
      <HeroVideoBackground />

      <div className="relative z-10 mx-auto flex min-h-[min(72vh,720px)] max-w-3xl flex-col justify-center px-4 py-16 sm:px-6 lg:py-20">
        <div className="rounded-2xl border border-white/10 bg-card/55 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-md sm:p-8 lg:p-10">
          <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-accent sm:text-left">
            [ Alta precisão · Custo acessível · Cobertura nacional ]
          </p>
          <h1 className="mt-4 text-center text-3xl font-bold leading-tight tracking-tight sm:text-left sm:text-4xl lg:text-5xl">
            A rede NTRIP para{" "}
            <span className="text-accent">drones, máquinas e topografia</span>
          </h1>
          <p className="mt-5 text-center text-base leading-relaxed text-muted sm:text-left sm:text-lg">
            Correção GNSS em tempo real para equipamentos no campo — do Matrice
            com LiDAR ao harvester e ao receptor RTK, sem base própria em cada obra.
          </p>

          <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4">
            {highlights.map((h) => (
              <li
                key={h.label}
                className="rounded-xl border border-card-border/80 bg-background/50 px-3 py-3 text-center sm:px-4"
              >
                <p className="text-lg font-bold text-accent sm:text-xl">{h.value}</p>
                <p className="mt-0.5 text-[11px] text-muted sm:text-xs">{h.label}</p>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="#contato"
              className="rounded-full bg-accent px-6 py-3.5 text-center text-sm font-semibold text-background transition hover:bg-accent-dim"
            >
              Avaliação gratuita 30 dias
            </Link>
            <Link
              href="/cobertura"
              className="rounded-full border border-drone/40 bg-drone/10 px-6 py-3.5 text-center text-sm font-medium text-drone transition hover:bg-drone/20"
            >
              Ver cobertura
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
