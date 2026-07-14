import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeading } from "@/components/dashboard/page-heading";
import { RtkValidationWorkspace } from "@/components/rtk-validation/rtk-validation-workspace";
import { getSession } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rtkValidation");
  return { title: `${t("pageTitle")} | Datageo Ntrip` };
}

export default async function ValidacaoRtkPage() {
  const user = await getSession();
  const t = await getTranslations("rtkValidation");
  if (!user) return null;

  return (
    <main className="flex-1 bg-[#f3f4f6] p-4 text-[#111827] sm:p-8">
      <PageHeading title={t("pageTitle")} description={t("pageDescription")} />
      <RtkValidationWorkspace user={user} />
    </main>
  );
}
