"use client";

import dynamic from "next/dynamic";

const CoverageMap = dynamic(() => import("./coverage-map").then((m) => m.CoverageMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[420px] items-center justify-center rounded-xl border border-card-border bg-card text-sm text-muted">
      A carregar mapa de cobertura…
    </div>
  ),
});

export function CoverageMapDynamic({ compact }: { compact?: boolean }) {
  const heightClass = compact ? "h-[420px] min-h-[420px]" : "h-[min(72vh,640px)] min-h-[420px]";
  return (
    <div className={heightClass}>
      <CoverageMap compact={compact} />
    </div>
  );
}
