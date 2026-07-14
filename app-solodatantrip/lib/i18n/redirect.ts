import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";

export function redirectToLogin(locale?: AppLocale) {
  const loc = locale ?? "pt-BR";
  redirect(loc === "pt-BR" ? "/login" : `/${loc}/login`);
}
