import { buildCoverageEmbedUrl } from "@/lib/coverage-embed";

type CoverageMapEmbedProps = {
  compact?: boolean;
  className?: string;
  center?: [number, number];
  zoom?: number;
};

export function CoverageMapEmbed({
  compact = false,
  className = "",
  center,
  zoom,
}: CoverageMapEmbedProps) {
  const src = buildCoverageEmbedUrl({
    theme: "dark",
    lang: "pt",
    color: "00C8F0",
    zoom: zoom ?? (compact ? 3 : 3.5),
    center: center ?? [-14, -54],
  });

  const heightClass = compact
    ? "h-[420px] min-h-[420px]"
    : "h-[min(72vh,640px)] min-h-[420px]";

  return (
    <div
      className={`coverage-embed overflow-hidden rounded-xl border border-card-border ${className || heightClass}`}
    >
      <iframe
        src={src}
        title="Mapa de cobertura RTK"
        loading="lazy"
        className="h-full w-full border-0"
        allowFullScreen
      />
    </div>
  );
}
