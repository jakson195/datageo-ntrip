"use client";

import { useEffect, useRef, useState } from "react";
import { CoverageMapDynamic } from "./coverage-map-dynamic";

type Props = {
  compact?: boolean;
  rootMargin?: string;
};

export function CoverageMapViewport({ compact, rootMargin = "200px" }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  const placeholderClass = compact
    ? "h-[420px] min-h-[420px]"
    : "h-[min(72vh,640px)] min-h-[420px]";

  return (
    <div ref={hostRef} className={placeholderClass}>
      {visible ? (
        <CoverageMapDynamic compact={compact} />
      ) : (
        <div
          className={`flex ${placeholderClass} items-center justify-center rounded-xl border border-card-border bg-card text-sm text-muted`}
        >
          Mapa de cobertura será carregado ao rolar…
        </div>
      )}
    </div>
  );
}
