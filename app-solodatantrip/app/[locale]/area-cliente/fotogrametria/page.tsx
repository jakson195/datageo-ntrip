import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeading } from "@/components/dashboard/page-heading";
import { PhotogrammetryWorkspace } from "@/components/photogrammetry/photogrammetry-workspace";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("photogrammetry");
  return { title: `${t("pageTitle")} | Datageo Ntrip` };
}

export default async function FotogrametriaPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  const t = await getTranslations("photogrammetry");

  return (
    <main className="flex-1 bg-[#f3f4f6] p-4 text-[#111827] sm:p-8">
      <PageHeading title={t("pageTitle")} description={t("pageDescription")} />
      <PhotogrammetryWorkspace />
    </main>
  );
}
