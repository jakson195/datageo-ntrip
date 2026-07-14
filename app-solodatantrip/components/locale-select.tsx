"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

const labels: Record<AppLocale, string> = {
  "pt-BR": "Português",
};

export function LocaleSelect({ className = "" }: { className?: string }) {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();

  function onChange(next: string) {
    router.replace(pathname, { locale: next as AppLocale });
  }

  return (
    <label className={`relative inline-flex ${className}`}>
      <span className="sr-only">Idioma</span>
      <select
        value={locale}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-full border border-white/15 bg-black/40 py-2.5 pl-4 pr-9 text-base font-medium text-foreground transition hover:border-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-geo/50"
        aria-label="Idioma"
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc} className="bg-card text-foreground">
            {labels[loc]}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>
    </label>
  );
}
