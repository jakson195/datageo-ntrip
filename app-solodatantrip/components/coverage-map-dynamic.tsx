"use client";

import dynamic from "next/dynamic";

const CoverageMap = dynamic(() => import("./coverage-map").then((m) => m.CoverageMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-xl border border-card-border bg-card text-sm text-muted">
      A carregar mapa de cobertura…
    </div>
  ),
});

export function CoverageMapDynamic({ compact }: { compact?: boolean }) {
  return <CoverageMap compact={compact} />;
}
