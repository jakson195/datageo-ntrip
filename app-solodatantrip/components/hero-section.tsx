import { HardNavLink } from "./hard-nav-link";

const features = [
  { code: "RTK", label: "Precisão centimétrica" },
  { code: "NTRIP", label: "Correção em tempo real" },
  { code: "SaaS", label: "Painel do cliente" },
  { code: "PPK", label: "RINEX sob demanda" },
];

const heroStats = [
  { value: "30 dias", label: "Avaliação grátis" },
  { value: "1–2 cm", label: "Precisão RTK" },
  { value: "BR", label: "Cobertura nacional" },
  { value: "24/7", label: "Caster NTRIP" },
];

export function HeroSection() {
  return (
    <section className="relative pt-[6.25rem] sm:pt-[7.25rem] lg:pt-[8rem]">
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[520px]" aria-hidden />

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-6 sm:px-6 sm:pb-8">
        <div className="hero-panel rounded-3xl p-6 sm:p-8 lg:p-10 xl:p-12">
          <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-brand-geo sm:text-xs">
                [ Campo · Escritório · Cliente — num só lugar ]
              </p>

              <h1 className="mt-5 text-3xl font-bold leading-[1.12] tracking-tight sm:text-4xl lg:text-[2.65rem] lg:leading-[1.1]">
                Plataforma NTRIP para{" "}
                <span className="brand-gradient-text">drones e topografia</span>
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
                Caster NTRIP, credenciais no painel, mapa de cobertura e suporte em campo —
                do cadastro à correção RTK no rover ou no drone, sem base própria em cada obra.
              </p>

              <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4">
                {features.map((f) => (
                  <li key={f.code} className="hero-feature-card rounded-2xl px-4 py-4 sm:px-5 sm:py-5">
                    <p className="text-2xl font-bold tracking-tight text-brand-geo sm:text-3xl">
                      {f.code}
                    </p>
                    <p className="mt-1 text-xs text-muted sm:text-sm">{f.label}</p>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <HardNavLink
                  href="/cadastro"
                  className="rounded-full btn-brand-primary px-7 py-3.5 text-center text-sm sm:text-base"
                >
                  Trial grátis 30 dias
                </HardNavLink>
                <HardNavLink
                  href="/#ntrip"
                  className="rounded-full btn-brand-outline px-7 py-3.5 text-center text-sm font-medium sm:text-base"
                >
                  Ver módulos
                </HardNavLink>
              </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6 border-t border-card-border/60 pt-8 sm:grid-cols-4 sm:gap-8">
          {heroStats.map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-brand-geo sm:text-3xl">{s.value}</p>
              <p className="mt-1 text-sm text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
