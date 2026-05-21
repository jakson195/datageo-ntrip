import Link from "next/link";
import type { SessionUser } from "@/lib/auth";

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
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              subscription.status === "ativo"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {subscription.status === "ativo" ? "Ativo" : "Inativo"}
          </span>
          <Link
            href="/#planos"
            className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/20"
          >
            Ver planos
          </Link>
        </div>
      </div>
    </section>
  );
}
