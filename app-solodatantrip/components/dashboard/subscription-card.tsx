import Link from "next/link";
import type { SessionUser } from "@/lib/auth";

const STATUS_LABEL: Record<SessionUser["subscription"]["status"], string> = {
  pending: "Pendente",
  active: "Ativa",
  suspended: "Suspensa",
  expired: "Expirada",
};

const STATUS_CLASS: Record<SessionUser["subscription"]["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  active: "bg-emerald-100 text-emerald-700",
  suspended: "bg-red-100 text-red-700",
  expired: "bg-slate-200 text-slate-700",
};

export function SubscriptionCard({ subscription }: { subscription: SessionUser["subscription"] }) {
  return (
    <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0f172a]">Sua assinatura</h2>
          <p className="mt-1 text-sm text-[#64748b]">{subscription.label}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASS[subscription.status]}`}
          >
            {STATUS_LABEL[subscription.status]}
          </span>
          <Link
            href="/area-cliente/planos"
            className="rounded-xl border border-brand-geo/40 bg-brand-geo/10 px-4 py-2 text-sm font-medium text-brand-geo transition hover:bg-brand-geo/20"
          >
            Ver planos
          </Link>
        </div>
      </div>
    </section>
  );
}
