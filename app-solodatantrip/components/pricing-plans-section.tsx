import { HardNavLink } from "./hard-nav-link";
import {
  compareMonthlyPriceBrl,
  formatPlanBrl,
  MARKETING_PLANS,
  monthlyPriceBrl,
} from "@/lib/plans-catalog";

export function PricingPlansSection() {
  return (
    <section id="planos" className="scroll-mt-32 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Escolha seu plano de assinatura RTK
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted">
            Obtenha o melhor custo-benefício para dados de alta precisão. Valores convertidos de
            USD para BRL (câmbio × 6).
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {MARKETING_PLANS.map((plan) => {
            const monthly = monthlyPriceBrl(plan);
            const compare = compareMonthlyPriceBrl(plan);
            const isPopular = plan.highlight;
            const isEnterprise = monthly == null;

            return (
              <article
                key={plan.slug}
                className={`pricing-card relative flex flex-col overflow-hidden rounded-2xl border shadow-lg ${
                  isPopular
                    ? "pricing-card-popular border-brand-geo"
                    : "border-card-border bg-surface-card text-[#0f172a]"
                }`}
              >
                {plan.badge && (
                  <span
                    className={`pricing-ribbon ${
                      plan.badgeVariant === "tco" ? "pricing-ribbon-tco" : "pricing-ribbon-popular"
                    }`}
                  >
                    {plan.badge}
                  </span>
                )}

                <div
                  className={`px-5 py-4 ${
                    isPopular
                      ? "bg-white text-[#0f172a]"
                      : "bg-brand-data text-white"
                  }`}
                >
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                </div>

                <div
                  className={`flex flex-1 flex-col px-5 py-6 ${
                    isPopular ? "bg-brand-data text-white" : "bg-white text-[#0f172a]"
                  }`}
                >
                  <div className="min-h-[5.5rem]">
                    {!isEnterprise && monthly != null && (
                      <>
                        <p
                          className={`text-sm line-through ${
                            isPopular ? "text-white/65" : "text-[#94a3b8]"
                          }`}
                        >
                          {formatPlanBrl(compare)}
                        </p>
                        <p className="mt-1 flex flex-wrap items-baseline gap-1">
                          <span className="text-4xl font-extrabold tracking-tight">
                            {formatPlanBrl(monthly)}
                          </span>
                          <span className={`text-sm ${isPopular ? "text-white/80" : "text-[#64748b]"}`}>
                            {plan.periodLabel}
                          </span>
                        </p>
                      </>
                    )}
                    {isEnterprise && (
                      <p className="text-5xl font-extrabold tracking-tight text-brand-data">$$$</p>
                    )}
                  </div>

                  <p
                    className={`mt-4 text-sm leading-relaxed ${
                      isPopular ? "text-white/90" : "text-[#475569]"
                    }`}
                  >
                    {plan.summary}
                  </p>

                  <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2 leading-snug">
                        <span className={isPopular ? "text-brand-ntrip" : "text-brand-geo"}>✓</span>
                        <span className={isPopular ? "text-white/95" : "text-[#334155]"}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <HardNavLink
                    href={plan.href}
                    className={`mt-8 block rounded-lg py-3 text-center text-sm font-semibold transition ${
                      isPopular
                        ? "bg-white text-brand-data hover:bg-white/90"
                        : isEnterprise
                          ? "bg-brand-data text-white hover:bg-[#153d72]"
                          : "bg-brand-data text-white hover:bg-[#153d72]"
                    } ${plan.cta.length > 24 ? "text-xs sm:text-sm" : ""}`}
                  >
                    {plan.cta}
                  </HardNavLink>
                </div>
              </article>
            );
          })}
        </div>

        <p className="mt-10 text-center text-sm text-muted">
          Ainda não tem certeza?{" "}
          <HardNavLink href="/cadastro" className="font-medium text-brand-geo hover:underline">
            Trial grátis por 30 dias
          </HardNavLink>{" "}
          — sem cartão de crédito.
        </p>
      </div>
    </section>
  );
}
