/** RTKdata Coverage Map Embed — docs.rtkdata.com */
export const COVERAGE_EMBED_BASE = "https://rtkdata.com/coverage-embed/";

export type CoverageEmbedTheme = "dark" | "light";
export type CoverageEmbedLang = "en" | "de" | "pt";

export type CoverageEmbedOptions = {
  theme?: CoverageEmbedTheme;
  lang?: CoverageEmbedLang;
  /** 6-digit hex without # (brand accent for coverage areas) */
  color?: string;
  zoom?: number;
  /** [latitude, longitude] */
  center?: [number, number];
  search?: boolean;
  legend?: boolean;
  status?: boolean;
  zoombtns?: boolean;
};

const DEFAULT_CENTER: [number, number] = [-14, -54];

function hexColor(color: string): string {
  return color.replace(/^#/, "").toUpperCase();
}

export function buildCoverageEmbedUrl(options: CoverageEmbedOptions = {}): string {
  const params = new URLSearchParams();
  params.set("theme", options.theme ?? "dark");
  params.set("lang", options.lang ?? "pt");
  params.set("color", hexColor(options.color ?? "00C8F0"));
  params.set("zoom", String(options.zoom ?? 3));

  const [lat, lng] = options.center ?? DEFAULT_CENTER;
  params.set("center", `${lat},${lng}`);

  if (options.search === false) params.set("search", "0");
  if (options.legend === false) params.set("legend", "0");
  if (options.status === false) params.set("status", "0");
  if (options.zoombtns === false) params.set("zoombtns", "0");

  return `${COVERAGE_EMBED_BASE}?${params.toString()}`;
}
