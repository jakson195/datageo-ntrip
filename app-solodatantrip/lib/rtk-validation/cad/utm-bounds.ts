import type { CadViewport } from "./viewport";

/** Coordenadas parecem UTM em metros (não graus locais). */
export function isLikelyUtmViewport(
  bounds: Pick<CadViewport, "minX" | "maxX" | "minY" | "maxY">,
): boolean {
  const spanX = Math.abs(bounds.maxX - bounds.minX);
  const spanY = Math.abs(bounds.maxY - bounds.minY);
  const maxCoord = Math.max(
    Math.abs(bounds.minX),
    Math.abs(bounds.maxX),
    Math.abs(bounds.minY),
    Math.abs(bounds.maxY),
  );
  return maxCoord > 1_000 && spanX > 1 && spanY > 1;
}
