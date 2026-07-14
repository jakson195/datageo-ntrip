"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/brand-logo";

export function RtkTopBar() {
  const t = useTranslations("dashboard.topBar");
  const th = useTranslations("header");

  return (
    <header className="flex h-24 items-center justify-between gap-4 border-b border-surface-border bg-surface-card px-4 sm:px-6 lg:h-[6.5rem]">
      <BrandLogo href="/" size="header" variant="light" showWordmark />
      <div className="hidden items-center gap-6 text-base font-medium text-[#4b5563] md:flex">
        <Link href="/#ntrip" className="hover:text-brand-data">
          {t("product")}
        </Link>
        <Link href="/#setores" className="hover:text-brand-data">
          {t("sectors")}
        </Link>
        <Link href="/#planos" className="hover:text-brand-geo">
          {t("pricing")}
        </Link>
        <Link href="/cobertura" className="hover:text-brand-geo">
          {t("coverage")}
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/#contato"
          className="hidden rounded-lg border border-surface-border px-4 py-2.5 text-base font-medium text-[#374151] sm:inline-block"
        >
          {t("scheduleMeeting")}
        </Link>
        <Link
          href="/cadastro"
          className="rounded-lg btn-brand-primary px-5 py-2.5 text-base font-semibold"
        >
          {th("freeTrial")}
        </Link>
      </div>
    </header>
  );
}
