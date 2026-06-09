import { redirect } from "next/navigation";
import Link from "next/link";
import { CoverageMapViewport } from "@/components/coverage-map-viewport";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function AreaClienteCoberturaPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <>
      <DashboardHeader
        user={user}
        title="Cobertura"
        subtitle="Consulte a disponibilidade de correção na sua região"
      />
      <div className="flex-1 p-4 sm:p-8">
        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm sm:p-6">
          <CoverageMapViewport compact={false} />
          <Link
            href="/cobertura"
            target="_blank"
            className="mt-4 inline-block text-sm font-medium text-brand-geo hover:underline"
          >
            Abrir mapa em tela cheia →
          </Link>
        </div>
      </div>
    </>
  );
}
