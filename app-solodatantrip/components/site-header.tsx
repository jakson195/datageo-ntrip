"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandLogo } from "./brand-logo";
import { HardNavLink } from "./hard-nav-link";
import { LocaleSelect } from "./locale-select";

const nav = [
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/cobertura", label: "Cobertura" },
  { href: "/#aplicacoes", label: "Aplicações" },
  { href: "/#diferenciais", label: "Diferenciais" },
  { href: "/#ntrip", label: "Módulos" },
  { href: "/#planos", label: "Planos" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#contato", label: "Contato" },
];

function NavLinks({ onNavigate, className = "" }: { onNavigate?: () => void; className?: string }) {
  return (
    <>
      {nav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={`whitespace-nowrap text-base font-medium text-muted transition-colors hover:text-foreground lg:text-[17px] ${className}`}
        >
          {item.label}
        </Link>
      ))}
    </>
  );
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-[5.75rem] max-w-7xl items-center gap-3 px-4 sm:h-24 sm:gap-4 sm:px-6 lg:h-[6.5rem] lg:grid lg:grid-cols-[minmax(0,auto)_minmax(0,1fr)_auto] lg:items-center lg:gap-6">
        <div className="min-w-0 shrink-0 lg:pr-2">
          <BrandLogo size="header" showWordmark />
        </div>

        <nav className="hidden min-w-0 items-center justify-center gap-4 lg:flex xl:gap-7">
          <NavLinks />
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-2.5 lg:ml-0">
          <LocaleSelect className="hidden sm:inline-flex" />

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

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-foreground transition hover:border-white/25 lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="site-mobile-nav"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div
          id="site-mobile-nav"
          className="border-t border-white/[0.06] bg-background/95 px-4 py-4 lg:hidden sm:px-6"
        >
          <nav className="flex flex-col gap-3">
            <NavLinks onNavigate={() => setMenuOpen(false)} className="py-1.5" />
          </nav>
          <div className="mt-4 sm:hidden">
            <LocaleSelect className="inline-flex w-full" />
          </div>
        </div>
      ) : null}
    </header>
  );
}
