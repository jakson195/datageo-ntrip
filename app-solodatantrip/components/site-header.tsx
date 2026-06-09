import Link from "next/link";
import { BrandLogo } from "./brand-logo";
import { HardNavLink } from "./hard-nav-link";

const nav = [
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/cobertura", label: "Cobertura" },
  { href: "/#setores", label: "Setores" },
  { href: "/#ntrip", label: "Módulos" },
  { href: "/#planos", label: "Planos" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#contato", label: "Contato" },
];

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-[5.75rem] max-w-7xl items-center justify-between gap-3 px-4 sm:h-24 sm:gap-5 sm:px-6 lg:h-[6.5rem]">
        <div className="min-w-0 shrink-0 pr-1">
          <BrandLogo size="header" showWordmark />
        </div>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-5 xl:flex xl:gap-7">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap text-base font-medium text-muted transition-colors hover:text-foreground lg:text-[17px]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
          <Link
            href="/login"
            className="rounded-full btn-brand-ghost px-4 py-2.5 text-base font-medium sm:px-5 sm:py-3"
          >
            Entrar
          </Link>
          <HardNavLink
            href="/cadastro"
            className="rounded-full btn-brand-primary px-4 py-2.5 text-base font-semibold sm:px-6 sm:py-3"
          >
            Trial grátis
          </HardNavLink>
        </div>
      </div>
    </header>
  );
}
