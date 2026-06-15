/** Conversão USD → BRL para planos RTK Data */
export const USD_TO_BRL = 6;

export type MarketingPlan = {
  slug: string;
  name: string;
  /** Preço mensal equivalente em USD (referência RTK Data) */
  priceUsdMonthly: number | null;
  compareUsdMonthly: number;
  periodLabel: string;
  summary: string;
  features: string[];
  cta: string;
  href: string;
  highlight?: boolean;
  badge?: string;
  badgeVariant?: "popular" | "tco";
  /** Preço total cobrado no período (BRL) — usado no banco */
  billingPriceBrl: number;
  durationDays: number;
  maxDevices: number;
};

function brl(usd: number): number {
  return Math.round(usd * USD_TO_BRL * 100) / 100;
}

export function formatPlanBrl(value: number, monthly = false): string {
  const formatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
  return monthly ? `${formatted} / mês` : formatted;
}

/** Planos exibidos no site (espelho RTK Data × 6) */
export const MARKETING_PLANS: MarketingPlan[] = [
  {
    slug: "mensal",
    name: "Plano Mensal",
    priceUsdMonthly: 40,
    compareUsdMonthly: 50,
    periodLabel: "/ mês",
    summary: "Comece hoje, cancele quando quiser.",
    features: [
      "Conjunto completo de recursos RTK, sem limitação de desempenho",
      "1 licença = 1 fluxo de dados simultâneo",
      "Troque de dispositivo quando quiser",
    ],
    cta: "Escolha Mensal",
    href: "/#contato",
    billingPriceBrl: brl(40),
    durationDays: 30,
    maxDevices: 1,
  },
  {
    slug: "anual",
    name: "Plano Anual",
    priceUsdMonthly: 33.33,
    compareUsdMonthly: 50,
    periodLabel: "/ mês",
    summary: "Economize 34% com acesso ilimitado durante todo o ano.",
    features: [
      "Todos os recursos principais do RTK",
      "Adicione licenças à medida que sua empresa cresce",
      "Suporte prioritário",
    ],
    cta: "Escolha o plano anual e economize",
    href: "/#contato",
    highlight: true,
    badge: "POPULAR",
    badgeVariant: "popular",
    billingPriceBrl: brl(33.33 * 12),
    durationDays: 365,
    maxDevices: 3,
  },
  {
    slug: "quinquenal",
    name: "Plano de 5 anos",
    priceUsdMonthly: 32,
    compareUsdMonthly: 50,
    periodLabel: "/ mês",
    summary: "Menor custo total de propriedade em todos os planos.",
    features: [
      "Faça um orçamento e concentre-se no trabalho de campo",
      "Adicione licenças extras com preço fixo",
      "Suporte prioritário",
    ],
    cta: "Escolha 5 anos",
    href: "/#contato",
    badge: "MENOR TCO",
    badgeVariant: "tco",
    billingPriceBrl: brl(32 * 60),
    durationDays: 365 * 5,
    maxDevices: 5,
  },
  {
    slug: "empresa",
    name: "Empresa",
    priceUsdMonthly: null,
    compareUsdMonthly: 50,
    periodLabel: "",
    summary: "Preços por volume e faturamento centralizado.",
    features: [
      "Gerente de sucesso dedicado",
      "Adaptável às suas necessidades",
      "Aquisição de PO / fatura",
      "Vários acessos simultâneos",
    ],
    cta: "Solicite um orçamento",
    href: "/#contato",
    billingPriceBrl: 0,
    durationDays: 365,
    maxDevices: 50,
  },
];

/** Planos persistidos no PostgreSQL (trial + assinaturas) */
export const DATABASE_PLANS = [
  { slug: "trial", name: "Trial", price: 0, durationDays: 30, maxDevices: 1 },
  ...MARKETING_PLANS.filter((p) => p.slug !== "empresa").map((p) => ({
    slug: p.slug,
    name: p.name,
    price: p.billingPriceBrl,
    durationDays: p.durationDays,
    maxDevices: p.maxDevices,
  })),
  {
    slug: "empresa",
    name: "Empresa",
    price: 0,
    durationDays: 365,
    maxDevices: 50,
  },
];

export function monthlyPriceBrl(plan: MarketingPlan): number | null {
  if (plan.priceUsdMonthly == null) return null;
  return brl(plan.priceUsdMonthly);
}

export function compareMonthlyPriceBrl(plan: MarketingPlan): number {
  return brl(plan.compareUsdMonthly);
}
