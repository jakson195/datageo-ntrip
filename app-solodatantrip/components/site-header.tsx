import Link from "next/link";

const nav = [
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/#setores", label: "Setores" },
  { href: "/cobertura", label: "Cobertura" },
  { href: "/#ntrip", label: "NTRIP" },
  { href: "/#planos", label: "Planos" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#contato", label: "Contato" },
];

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-card-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-sm text-accent">
            DG
          </span>
          <span>
            Datageo <span className="text-accent">Ntrip</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="https://wa.me/5511999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-full border border-card-border px-4 py-2 text-sm text-muted transition hover:border-accent/40 hover:text-foreground sm:inline-flex"
          >
            WhatsApp
          </Link>
          <Link
            href="/login"
            className="hidden rounded-full border border-card-border px-4 py-2 text-sm text-muted transition hover:border-accent/40 hover:text-foreground sm:inline-flex"
          >
            Área do cliente
          </Link>
          <Link
            href="/#contato"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-background transition hover:bg-accent-dim"
          >
            Teste grátis
          </Link>
        </div>
      </div>
    </header>
  );
}
